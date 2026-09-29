import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { LETTER_MEMBER_COLUMNS, buildLetter, type LetterMember } from "@/lib/acceptance-letter";
import { callAppsScript } from "@/lib/apps-script";

// Carta de aceptación de prácticas.
//   GET  ?integranteId=…  → datos que se usarán (para el modal de confirmación)
//   POST { integranteId } → genera el documento vía Google Apps Script
// El navegador solo manda el id: los datos salen de team_members (con la
// sesión y el RLS del usuario) y la URL del Apps Script vive únicamente en
// el servidor (GOOGLE_APPS_SCRIPT_URL). En Netlify esta ruta corre como
// función serverless del plugin de Next.js.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Por debajo del límite de 10 s de las funciones de Netlify, para devolver
// un mensaje claro en vez de un 502 genérico. Ajustable por entorno.
const TIMEOUT_MS = Number(process.env.GOOGLE_APPS_SCRIPT_TIMEOUT_MS) || 9500;

// Evita dos generaciones simultáneas del mismo integrante (doble clic). No
// impide regenerarla después.
const inFlight = new Set<string>();

type Fail = { ok: false; error: string; missing?: string[] };

function fail(status: number, error: string, extra: Partial<Fail> = {}) {
  return NextResponse.json({ ok: false, error, ...extra } satisfies Fail, { status });
}

async function loadMember(integranteId: string | null) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: fail(401, "Tu sesión expiró. Vuelve a iniciar sesión.") };
  // Solo el admin genera cartas (los líderes ven Integrantes pero no esto).
  if (profile.role !== "admin") {
    return { error: fail(403, "No tienes permiso para generar cartas.") };
  }
  if (!integranteId || !UUID_RE.test(integranteId)) {
    return { error: fail(400, "Integrante no válido.") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select(LETTER_MEMBER_COLUMNS)
    .eq("id", integranteId)
    .maybeSingle();
  if (error) {
    console.error("[generar-carta] error de base de datos", { integranteId, code: error.code });
    return { error: fail(500, "No pudimos leer los datos del integrante. Inténtalo nuevamente.") };
  }
  if (!data) return { error: fail(404, "El integrante no existe o no tienes acceso a él.") };
  return { member: data as LetterMember };
}

export async function GET(request: NextRequest) {
  const { member, error } = await loadMember(request.nextUrl.searchParams.get("integranteId"));
  if (error) return error;
  const { preview } = buildLetter(member);
  return NextResponse.json({ ok: true, preview }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return fail(403, "Solicitud no permitida.");
  }
  const body = await request.json().catch(() => null);
  const integranteId = typeof body?.integranteId === "string" ? body.integranteId : null;

  const { member, error } = await loadMember(integranteId);
  if (error) return error;

  const { preview, payload } = buildLetter(member);
  if (!payload) {
    return fail(422, "Faltan datos para generar la carta.", { missing: preview.missing });
  }

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!scriptUrl) {
    console.error("[generar-carta] falta la variable GOOGLE_APPS_SCRIPT_URL");
    return fail(503, "La generación de cartas todavía no está configurada. Avisa a un administrador.");
  }

  if (inFlight.has(member.id)) {
    return fail(409, "Ya se está generando la carta de este integrante. Espera unos segundos.");
  }
  inFlight.add(member.id);

  try {
    const result = await callAppsScript(payload, {
      url: scriptUrl,
      token: process.env.GOOGLE_APPS_SCRIPT_TOKEN,
      timeoutMs: TIMEOUT_MS,
      logContext: { integranteId: member.id },
    });
    if (!result.ok) return fail(result.status, result.error);

    return NextResponse.json({
      ok: true,
      documentUrl: result.documentUrl,
      nombreArchivo: result.nombreArchivo,
      nombreCompleto: payload.nombreCompleto,
      fechaInicio: payload.fechaInicio,
      fechaFin: payload.fechaFin,
    });
  } finally {
    inFlight.delete(member.id);
  }
}
