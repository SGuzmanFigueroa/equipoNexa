import { NextResponse, type NextRequest } from "next/server";
import { callSalidaScript } from "@/lib/offboarding";
import { fail, getRetiredMember } from "@/lib/offboarding-server";

// Encuesta de salida del integrante retirado.
//   GET  → { respondido } (¿ya la envió?)
//   POST → guarda sus respuestas en el Google Sheet (vía Apps Script)

export async function GET() {
  const { member, error } = await getRetiredMember();
  if (error) return error;
  const result = await callSalidaScript("estado", { memberId: member.id });
  if (!result.ok) return fail(result.status, result.error);
  return NextResponse.json(
    { ok: true, respondido: result.data.respondido === true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 4000) : "");

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return fail(403, "Solicitud no permitida.");
  }
  const { member, profile, error } = await getRetiredMember();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const ambiente = Number(body?.ambiente);
  if (!Number.isInteger(ambiente) || ambiente < 1 || ambiente > 10) {
    return fail(400, "Elige del 1 al 10 cómo sentiste el ambiente laboral.");
  }
  const aprendio = clean(body?.aprendio);
  const espera = clean(body?.espera);
  const meta = clean(body?.meta);
  if (!aprendio || !espera || !meta) return fail(400, "Responde todas las preguntas obligatorias.");
  const recomienda = { si: "Sí", tal_vez: "Tal vez", no: "No" }[clean(body?.recomienda)];
  if (!recomienda) return fail(400, "Cuéntanos si recomendarías Nexa Consulting TI.");

  const result = await callSalidaScript("responder", {
    memberId: member.id,
    nombre: member.full_name,
    dni: member.dni ?? "",
    correo: member.email ?? profile.email,
    area: member.area ?? "",
    cargo: member.position ?? "",
    ambiente,
    aprendio,
    espera,
    meta,
    recomienda,
    porque: clean(body?.porque),
    mejoras: clean(body?.mejoras),
  });
  if (!result.ok) return fail(result.status, result.error);
  return NextResponse.json({ ok: true });
}
