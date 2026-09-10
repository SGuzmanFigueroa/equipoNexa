"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function updateMember(memberId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const age = String(formData.get("age") ?? "").trim();
  const career = String(formData.get("career") ?? "").trim();
  const lastJobRole = String(formData.get("last_job_role") ?? "").trim();
  const linkedinUrl = String(formData.get("linkedin_url") ?? "").trim();
  const githubUsername = String(formData.get("github_username") ?? "").trim();
  const skills = String(formData.get("skills") ?? "").trim();
  const favoriteArea = String(formData.get("favorite_area") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const collaborationType = String(formData.get("collaboration_type") ?? "").trim();
  const joinDate = String(formData.get("join_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const status = String(formData.get("status") ?? "activo");
  const notes = String(formData.get("notes") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const projectIds = formData.getAll("project_ids").map(String).filter(Boolean);

  const { error } = await supabase
    .from("team_members")
    .update({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      age: age ? Number(age) : null,
      career: career || null,
      last_job_role: lastJobRole || null,
      linkedin_url: linkedinUrl || null,
      github_username: githubUsername || null,
      skills: skills || null,
      favorite_area: favoriteArea || null,
      area: area || null,
      position: position || null,
      collaboration_type: collaborationType || null,
      join_date: joinDate || null,
      end_date: endDate || null,
      status,
      notes: notes || null,
      profile_id: profileId || null,
    })
    .eq("id", memberId);

  if (error) {
    redirect(`/members/${memberId}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("team_member_projects").delete().eq("member_id", memberId);
  if (projectIds.length > 0) {
    await supabase
      .from("team_member_projects")
      .insert(projectIds.map((project_id) => ({ member_id: memberId, project_id })));
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

  redirect(`/members/${memberId}?success=${encodeURIComponent("Nota de seguimiento agregada.")}`);
}

export async function saveAvailability(memberId: string, slots: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  await supabase.from("team_member_availability").delete().eq("member_id", memberId);

  const rows = slots
    .map((slot) => {
      const [dayStr, hourStr] = slot.split("-");
      const day_of_week = Number(dayStr);
      const hour = Number(hourStr);
      if (Number.isNaN(day_of_week) || Number.isNaN(hour)) return null;
      return { member_id: memberId, day_of_week, hour };
    })
    .filter((r): r is { member_id: string; day_of_week: number; hour: number } => r !== null);

  if (rows.length > 0) {
    await supabase.from("team_member_availability").insert(rows);
  }
}
