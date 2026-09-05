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
  const area = String(formData.get("area") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const collaborationType = String(formData.get("collaboration_type") ?? "").trim();
  const joinDate = String(formData.get("join_date") ?? "");
  const status = String(formData.get("status") ?? "activo");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!fullName || !joinDate) {
    redirect(`/members/new?error=${encodeURIComponent("Completa al menos nombre y fecha de ingreso.")}`);
  }

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      area: area || null,
      position: position || null,
      collaboration_type: collaborationType || null,
      join_date: joinDate,
      status,
      notes: notes || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/members/new?error=${encodeURIComponent(error?.message ?? "No se pudo crear el integrante")}`);
  }

  redirect(`/members/${data.id}`);
}
