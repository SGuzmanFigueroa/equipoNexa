import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { buildCertificate, callSalidaScript } from "@/lib/offboarding";
import { fail, getRetiredMember } from "@/lib/offboarding-server";

// Certificado de participación (PDF), con los datos de la pestaña Nexa de
// la ficha. Dos formas de pedirlo:
//   - Admin, desde la ficha: { integranteId } → se genera directo.
//   - El propio integrante retirado (sin body): solo si ya respondió la
//     encuesta de salida (lo verifica el Apps Script).
// El PDF no se guarda: va directo al navegador.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = "id, full_name, dni, join_date, end_date";

async function loadForAdmin(integranteId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: fail(401, "Tu sesión expiró. Vuelve a iniciar sesión.") };
  if (profile.role !== "admin") return { error: fail(403, "No tienes permiso para generar certificados.") };
  if (!UUID_RE.test(integranteId)) return { error: fail(400, "Integrante no válido.") };
  const supabase = await createClient();
  const { data } = await supabase.from("team_members").select(COLUMNS).eq("id", integranteId).maybeSingle();
  if (!data) return { error: fail(404, "El integrante no existe.") };
  return { member: data };
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return fail(403, "Solicitud no permitida.");
  }
  const body = await request.json().catch(() => null);
  const integranteId = typeof body?.integranteId === "string" ? body.integranteId : null;
  const byAdmin = !!integranteId;

  const { member, error } = byAdmin ? await loadForAdmin(integranteId) : await getRetiredMember();
  if (error) return error;

  const { payload, missing } = buildCertificate(member);
  if (!payload) {
    return fail(
      422,
      byAdmin
        ? `Faltan datos en la ficha: ${missing.join(", ")}.`
        : `Faltan datos en tu ficha para el certificado: ${missing.join(", ")}. Avisa a un administrador.`,
    );
  }

  const result = await callSalidaScript("certificado", { memberId: member.id, sinEncuesta: byAdmin, ...payload });
  if (!result.ok) return fail(result.status, result.error);
  const { pdfBase64, nombreArchivo } = result.data;
  if (typeof pdfBase64 !== "string" || !pdfBase64) {
    return fail(502, "No pudimos generar el certificado. Inténtalo nuevamente.");
  }

  const name =
    typeof nombreArchivo === "string" && nombreArchivo
      ? nombreArchivo
      : `Certificado de participación - ${payload.nombreCompleto}.pdf`;
  const asciiName = name.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "");
  return new NextResponse(new Uint8Array(Buffer.from(pdfBase64, "base64")), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
