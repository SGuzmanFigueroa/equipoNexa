// Salida (offboarding) de un integrante: encuesta + certificado de
// participación. Tabla member_offboarding (migración 0013).
import { calcularFechaFin } from "@/lib/practice-dates";
import { isValidDni } from "@/lib/types";

export type Recommends = "si" | "tal_vez" | "no";

export const RECOMMENDS_LABELS: Record<Recommends, string> = {
  si: "Sí, la recomendaría",
  tal_vez: "Tal vez",
  no: "No la recomendaría",
};

export interface Offboarding {
  member_id: string;
  activated_at: string;
  activated_by: string | null;
  submitted_at: string | null;
  environment_rating: number | null;
  learned: string | null;
  expectations: string | null;
  career_goal: string | null;
  recommends: Recommends | null;
  recommend_reason: string | null;
  improvements: string | null;
  certificate_downloaded_at: string | null;
}

export const OFFBOARDING_COLUMNS =
  "member_id, activated_at, activated_by, submitted_at, environment_rating, learned, expectations, career_goal, recommends, recommend_reason, improvements, certificate_downloaded_at";

// Preguntas de texto de la encuesta, en el orden en que se muestran.
export const OFFBOARDING_TEXT_QUESTIONS = [
  {
    name: "learned",
    label: "¿Qué aprendiste durante tus prácticas en Nexa?",
    hint: "Herramientas, habilidades, metodologías, lo que más te sirvió.",
    required: true,
  },
  {
    name: "expectations",
    label: "¿Qué esperas luego de tus prácticas?",
    hint: "Tus próximos pasos: trabajo, especialización, estudios…",
    required: true,
  },
  {
    name: "career_goal",
    label: "¿A dónde quieres llegar profesionalmente?",
    hint: "El rol, empresa o meta que te gustaría alcanzar.",
    required: true,
  },
  {
    name: "improvements",
    label: "¿Qué podríamos mejorar en Nexa?",
    hint: "Opcional. Cualquier sugerencia nos ayuda.",
    required: false,
  },
] as const;

export function ratingLabel(n: number) {
  if (n <= 2) return "Muy malo";
  if (n <= 4) return "Malo";
  if (n <= 6) return "Regular";
  if (n <= 8) return "Bueno";
  return "Muy bueno";
}

// ---------- Certificado ----------

// RUC de Nexa Consulting TI S.A.C. (el mismo de la carta de aceptación).
const NEXA_RUC = process.env.NEXA_RUC || "20616354664";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// "2026-09-01" → "1 de septiembre de 2026"
export function formatDateLong(iso: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!match) return null;
  return `${Number(match[3])} de ${MONTHS[Number(match[2]) - 1]} de ${match[1]}`;
}

function todayInLima() {
  // en-CA da AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

export interface CertificatePayload {
  ruc: string;
  nombreCompleto: string;
  dni: string;
  fechaInicio: string;
  fechaFin: string;
  fechaEmision: string;
}

export function buildCertificate(member: {
  full_name: string | null;
  dni: string | null;
  join_date: string | null;
}): { payload: CertificatePayload | null; missing: string[] } {
  const nombre = member.full_name?.trim() || null;
  const dni = member.dni?.trim() || null;
  const inicio = member.join_date?.trim() || null;
  const fin = calcularFechaFin(inicio);

  const missing = [
    !nombre && "nombre completo",
    !isValidDni(dni) && "DNI",
    !inicio && "fecha de ingreso",
    inicio && !fin && "fecha de fin",
  ].filter((f): f is string => Boolean(f));
  if (missing.length > 0) return { payload: null, missing };

  return {
    missing,
    payload: {
      ruc: NEXA_RUC,
      nombreCompleto: nombre!,
      dni: dni!,
      fechaInicio: formatDateLong(inicio)!,
      fechaFin: formatDateLong(fin)!,
      fechaEmision: formatDateLong(todayInLima())!,
    },
  };
}

export type CertificateResult =
  | { ok: true; pdf: Buffer; nombreArchivo: string }
  | { ok: false; status: number; error: string };

// Llama al Web App de Apps Script del certificado (en la cuenta de Google
// dueña de la plantilla) y devuelve el PDF. La URL vive solo en el servidor.
export async function generateCertificatePdf(
  payload: CertificatePayload,
  { url, token, timeoutMs }: { url: string; token?: string; timeoutMs: number },
): Promise<CertificateResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify(token ? { ...payload, token } : payload),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    console.error("[certificado] Apps Script no respondió", { timedOut });
    return {
      ok: false,
      status: 504,
      error: timedOut
        ? "La generación del certificado tardó demasiado. Inténtalo de nuevo en unos segundos."
        : "No pudimos comunicarnos con Google Docs. Inténtalo nuevamente.",
    };
  }

  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(text);
    json = parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    json = null;
  }

  if (!res.ok || !json) {
    console.error("[certificado] respuesta inesperada de Apps Script", { status: res.status });
    return { ok: false, status: 502, error: "Google Docs no respondió correctamente. Inténtalo nuevamente." };
  }
  if (json.success !== true || typeof json.pdfBase64 !== "string" || !json.pdfBase64) {
    const reason = typeof json.error === "string" ? json.error : null;
    console.error("[certificado] Apps Script devolvió error", { reason });
    return { ok: false, status: 502, error: "No pudimos generar tu certificado. Inténtalo nuevamente." };
  }

  return {
    ok: true,
    pdf: Buffer.from(json.pdfBase64, "base64"),
    nombreArchivo:
      typeof json.nombreArchivo === "string" && json.nombreArchivo
        ? json.nombreArchivo
        : `Certificado de participación - ${payload.nombreCompleto}.pdf`,
  };
}
