import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { buildCertificate, generateCertificatePdf } from "@/lib/offboarding";

// Certificado de participación (PDF). Lo pide el propio integrante desde
// la pantalla de salida, solo después de enviar la encuesta. Los datos
// salen de su ficha (con su sesión y RLS) y el PDF lo arma un Apps Script
// en la cuenta de Google dueña de la plantilla (GOOGLE_CERT_SCRIPT_URL, solo
// en el servidor). El PDF no se guarda: se devuelve directo al navegador.

const TIMEOUT_MS = Number(process.env.GOOGLE_CERT_SCRIPT_TIMEOUT_MS) || 9500;

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return fail(403, "Solicitud no permitida.");
  }

  const profile = await getCurrentProfile();
  if (!profile) return fail(401, "Tu sesión expiró. Vuelve a iniciar sesión.");

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("id, full_name, dni, join_date")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!member) return fail(404, "Tu cuenta no está vinculada a una ficha de integrante.");

  const { data: offboarding } = await supabase
    .from("member_offboarding")
    .select("submitted_at")
    .eq("member_id", member.id)
    .maybeSingle();
  if (!offboarding?.submitted_at) {
    return fail(403, "Primero responde la encuesta de salida.");
  }

  const { payload, missing } = buildCertificate(member);
  if (!payload) {
    return fail(422, `Faltan datos en tu ficha para el certificado: ${missing.join(", ")}. Avisa a un administrador.`);
  }

  const scriptUrl = process.env.GOOGLE_CERT_SCRIPT_URL;
  if (!scriptUrl) {
    console.error("[certificado] falta la variable GOOGLE_CERT_SCRIPT_URL");
    return fail(503, "La descarga de certificados todavía no está configurada. Avisa a un administrador.");
  }

  const result = await generateCertificatePdf(payload, {
    url: scriptUrl,
    token: process.env.GOOGLE_CERT_SCRIPT_TOKEN,
    timeoutMs: TIMEOUT_MS,
  });
  if (!result.ok) return fail(result.status, result.error);

  await supabase.rpc("mark_offboarding_certificate");

  const asciiName = result.nombreArchivo.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "");
  return new NextResponse(new Uint8Array(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(result.nombreArchivo)}`,
      "Cache-Control": "no-store",
    },
  });
}
