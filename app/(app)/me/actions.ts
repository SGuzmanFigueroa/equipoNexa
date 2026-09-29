"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { decodeSlot, missingProfileFields } from "@/lib/types";
import { calcularFechaFin } from "@/lib/practice-dates";

// Only these columns are actually writable by self — enforced again by a
// DB trigger (enforce_self_editable_columns, see 0010) so this isn't just a
// UI restriction, but keep the payload narrow here too.
export async function updateMyProfile(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("id, area, join_date")
    .eq("profile_id", profile.id)
    .single();

  if (!member) {
    redirect("/me");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const age = String(formData.get("age") ?? "").trim();
  const career = String(formData.get("career") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const linkedinUrl = String(formData.get("linkedin_url") ?? "").trim();
  const skills = String(formData.get("skills") ?? "").trim();
  const githubUsername = String(formData.get("github_username") ?? "").trim();
  const favoriteArea = String(formData.get("favorite_area") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  // Área y fecha de ingreso: solo se toman si aún estaban vacías (el
  // trigger enforce_self_editable_columns aplica la misma regla en la BD).
  const area = member.area ?? String(formData.get("area") ?? "").trim();
  const joinDate = member.join_date ?? String(formData.get("join_date") ?? "").trim();
  const projectIds = formData.getAll("project_ids").map(String).filter(Boolean);

  const missing = missingProfileFields({
    full_name: fullName,
    phone,
    position,
    linkedin_url: linkedinUrl,
    skills,
    area,
    join_date: joinDate,
  });
  if (missing.length > 0) {
    redirect(
      `/me?error=${encodeURIComponent(`Completa los campos obligatorios: ${missing.join(", ")}.`)}`,
    );
  }

  const { error } = await supabase
    .from("team_members")
    .update({
      full_name: fullName,
      age: age ? Number(age) : null,
      career: career || null,
      phone,
      linkedin_url: linkedinUrl,
      skills,
      github_username: githubUsername || null,
      favorite_area: favoriteArea || null,
      position,
      area,
      join_date: joinDate,
      // Solo cuenta si join_date se está llenando por primera vez (el
      // trigger revierte end_date en cualquier otro caso).
      ...(member.join_date ? {} : { end_date: calcularFechaFin(joinDate) }),
    })
    .eq("id", member.id);

  if (error) {
    redirect(`/me?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("team_member_projects").delete().eq("member_id", member.id);
  if (projectIds.length > 0) {
    await supabase
      .from("team_member_projects")
      .insert(projectIds.map((project_id) => ({ member_id: member.id, project_id })));
  }

  redirect(`/me?success=${encodeURIComponent("Perfil actualizado.")}`);
}

export async function saveMyAvailability(slots: string[]) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!member) throw new Error("No estás vinculado a ninguna ficha de integrante.");

  const { error: deleteError } = await supabase
    .from("team_member_availability")
    .delete()
    .eq("member_id", member.id);
  if (deleteError) throw new Error(deleteError.message);

  const rows = slots
    .map(decodeSlot)
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => ({ member_id: member.id, ...s }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("team_member_availability").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }
}
