"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function updateMember(memberId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const collaborationType = String(formData.get("collaboration_type") ?? "").trim();
  const joinDate = String(formData.get("join_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "").trim();
  const status = String(formData.get("status") ?? "activo");
  const notes = String(formData.get("notes") ?? "").trim();

  await supabase
    .from("team_members")
    .update({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      area: area || null,
      position: position || null,
      collaboration_type: collaborationType || null,
      join_date: joinDate,
      end_date: endDate || null,
      status,
      notes: notes || null,
    })
    .eq("id", memberId);

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/dashboard");
}

export async function deleteMember(memberId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("team_members").delete().eq("id", memberId);
  redirect("/dashboard");
}

export async function addTrackingEntry(memberId: string, formData: FormData) {
  const profile = await requireAdmin();
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

  revalidatePath(`/members/${memberId}`);
}
