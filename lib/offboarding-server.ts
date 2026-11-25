import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

// El integrante de la sesión actual, solo si su salida está activa
// (estado "retirado"). Lo usan /api/salida y /api/certificado.
export async function getRetiredMember() {
  const profile = await getCurrentProfile();
  if (!profile) return { error: fail(401, "Tu sesión expiró. Vuelve a iniciar sesión.") };

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("id, full_name, dni, email, area, position, join_date, end_date, status")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!member) return { error: fail(404, "Tu cuenta no está vinculada a una ficha de integrante.") };
  if (member.status !== "retirado") return { error: fail(403, "La encuesta de salida no está disponible.") };
  return { member, profile };
}

export function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}
