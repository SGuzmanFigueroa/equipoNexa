import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { STATUS_LABELS, type MemberStatus, type TeamMember, type TrackingEntry } from "@/lib/types";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = await createClient();

  const [{ data: members }, { data: tracking }] = await Promise.all([
    supabase
      .from("team_members")
      .select("*")
      .order("join_date", { ascending: false, nullsFirst: false }),
    supabase
      .from("team_member_tracking")
      .select("*, member:team_members(full_name)")
      .order("entry_date", { ascending: false }),
  ]);

  const membersSheet = ((members ?? []) as TeamMember[]).map((m) => ({
    Nombre: m.full_name,
    Correo: m.email ?? "",
    Teléfono: m.phone ?? "",
    Edad: m.age ?? "",
    Carrera: m.career ?? "",
    "Rol de último trabajo": m.last_job_role ?? "",
    LinkedIn: m.linkedin_url ?? "",
    GitHub: m.github_username ?? "",
    Skills: m.skills ?? "",
    "Área favorita": m.favorite_area ?? "",
    "Área en Nexa": m.area ?? "",
    "Cargo en Nexa": m.position ?? "",
    "Tipo de colaboración": m.collaboration_type ?? "",
    "Fecha de ingreso": m.join_date ?? "",
    "Fecha de salida": m.end_date ?? "",
    Estado: STATUS_LABELS[m.status as MemberStatus] ?? m.status,
    Notas: m.notes ?? "",
  }));

  const trackingSheet = (
    (tracking ?? []) as (TrackingEntry & { member: { full_name: string } | null })[]
  ).map((t) => ({
    Integrante: t.member?.full_name ?? "",
    Fecha: t.entry_date,
    Nota: t.note,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(membersSheet),
    "Integrantes",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(trackingSheet),
    "Seguimiento",
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = `equipo-nexa-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
