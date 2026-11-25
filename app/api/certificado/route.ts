import { NextResponse, type NextRequest } from "next/server";
import { buildCertificate, callSalidaScript } from "@/lib/offboarding";
import { fail, getRetiredMember } from "@/lib/offboarding-server";

// Certificado de participación (PDF) del integrante retirado. El Apps
// Script solo lo entrega si ya respondió la encuesta de salida. Los datos
// salen de su ficha y el PDF no se guarda: va directo al navegador.

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return fail(403, "Solicitud no permitida.");
  }
  const { member, error } = await getRetiredMember();
  if (error) return error;

  const { payload, missing } = buildCertificate(member);
  if (!payload) {
    return fail(422, `Faltan datos en tu ficha para el certificado: ${missing.join(", ")}. Avisa a un administrador.`);
  }

  const result = await callSalidaScript("certificado", { memberId: member.id, ...payload });
  if (!result.ok) return fail(result.status, result.error);
  const { pdfBase64, nombreArchivo } = result.data;
  if (typeof pdfBase64 !== "string" || !pdfBase64) {
    return fail(502, "No pudimos generar tu certificado. Inténtalo nuevamente.");
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
