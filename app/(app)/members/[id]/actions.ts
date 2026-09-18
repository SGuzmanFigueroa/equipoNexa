"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireAdminOrLeader } from "@/lib/auth";
import { decodeSlot } from "@/lib/types";

// The profile page now splits the old one-big-form into several small
// forms (one per tab), each posting to this same action. Only fields that
// are actually present in the submitted FormData are written — a tab's
// form simply doesn't render inputs for fields it doesn't own, so
// submitting "Información" can no longer blank out "Nexa" or vice versa.
// Admin-only fields (full_name/email/join_date/profile_id) are sent as-is
// here but get silently reverted by the enforce_self_editable_columns DB
// trigger if the actor isn't admin. The role itself (admin/líder/etc.)
// isn't edited here at all — that's shared with bug-tracker's Usuarios y
// roles page.
const TEXT_FIELDS = [
  "full_name",
  "email",
  "phone",
  "career",
  "last_job_role",
  "linkedin_url",
  "github_username",
  "skills",
  "favorite_area",
  "area",
  "position",
  "collaboration_type",
  "join_date",
  "end_date",
  "notes",
  "profile_id",
] as const;

export async function updateMember(memberId: string, formData: FormData) {
  await requireAdminOrLeader();
  const supabase = await createClient();

  const updates: Record<string, string | number | null> = {};

  for (const field of TEXT_FIELDS) {
    if (!formData.has(field)) continue;
    const value = String(formData.get(field) ?? "").trim();
    updates[field] = value || null;
  }
  if (formData.has("age")) {
    const age = String(formData.get("age") ?? "").trim();
    updates.age = age ? Number(age) : null;
  }
  if (formData.has("status")) {
    updates.status = String(formData.get("status") ?? "activo");
  }
  // full_name is required at the DB level — never send an empty string.
  if ("full_name" in updates && !updates.full_name) delete updates.full_name;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("team_members").update(updates).eq("id", memberId);
    if (error) {
      redirect(`/members/${memberId}?error=${encodeURIComponent(error.message)}`);
    }
  }

  if (formData.has("manage_project_ids")) {
    const projectIds = formData.getAll("project_ids").map(String).filter(Boolean);
    await supabase.from("team_member_projects").delete().eq("member_id", memberId);
    if (projectIds.length > 0) {
      await supabase
        .from("team_member_projects")
        .insert(projectIds.map((project_id) => ({ member_id: memberId, project_id })));
    }
  }

  redirect(`/members/${memberId}?success=${encodeURIComponent("Cambios guardados exitosamente.")}`);
}

export async function deleteMember(memberId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("team_members").delete().eq("id", memberId);
  redirect(`/dashboard?success=${encodeURIComponent("Integrante eliminado.")}`);
}

export async function addTrackingEntry(memberId: string, formData: FormData) {
  const { profile } = await requireAdminOrLeader();
  const supabase = await createClient();

  const entryDate = String(formData.get("entry_date") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!note) {
    redirect(`/members/${memberId}?error=${encodeURIComponent("La nota de seguimiento no puede estar vacía.")}`);
  }

  await supabase.from("team_member_tracking").insert({
    member_id: memberId,
    entry_date: entryDate || new Date().toISOString().slice(0, 10),
    note,
    created_by: profile.id,
  });

  redirect(`/members/${memberId}?success=${encodeURIComponent("Nota de seguimiento agregada.")}`);
}

export async function saveAvailability(memberId: string, slots: string[]) {
  await requireAdminOrLeader();
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("team_member_availability")
    .delete()
    .eq("member_id", memberId);
  if (deleteError) throw new Error(deleteError.message);

  const rows = slots
    .map(decodeSlot)
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => ({ member_id: memberId, ...s }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("team_member_availability").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }
}
