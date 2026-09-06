"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function createMember(formData: FormData) {
  const profile = await requireAdmin();
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
  const status = String(formData.get("status") ?? "activo");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!fullName) {
    redirect(`/members/new?error=${encodeURIComponent("Completa al menos el nombre.")}`);
  }

  const { data, error } = await supabase
    .from("team_members")
    .insert({
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
      status,
      notes: notes || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/members/new?error=${encodeURIComponent(error?.message ?? "No se pudo crear el integrante")}`);
  }

  redirect(`/dashboard?success=${encodeURIComponent("Integrante registrado exitosamente.")}`);
}
