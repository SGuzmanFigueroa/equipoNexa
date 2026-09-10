"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { decodeSlot } from "@/lib/types";

// Only these columns are actually writable by self — enforced again by a
// DB trigger (enforce_self_editable_columns) so this isn't just a UI
// restriction, but keep the payload narrow here too.
export async function updateMyProfile(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!member) {
    redirect("/me");
  }

  const age = String(formData.get("age") ?? "").trim();
  const career = String(formData.get("career") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const githubUsername = String(formData.get("github_username") ?? "").trim();
  const favoriteArea = String(formData.get("favorite_area") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const projectIds = formData.getAll("project_ids").map(String).filter(Boolean);

  const { error } = await supabase
    .from("team_members")
    .update({
      age: age ? Number(age) : null,
      career: career || null,
      phone: phone || null,
      github_username: githubUsername || null,
      favorite_area: favoriteArea || null,
      position: position || null,
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

  if (!member) return;

  await supabase.from("team_member_availability").delete().eq("member_id", member.id);

  const rows = slots
    .map(decodeSlot)
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => ({ member_id: member.id, ...s }));

  if (rows.length > 0) {
    await supabase.from("team_member_availability").insert(rows);
  }
}
