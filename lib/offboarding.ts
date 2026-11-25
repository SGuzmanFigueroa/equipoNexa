// Salida (offboarding) de un integrante: cuando su estado es "retirado", al
// entrar solo ve el agradecimiento + encuesta de salida + certificado.
// Respuestas y PDF los maneja un Apps Script en la cuenta de Google dueña
// de la plantilla (google-apps-script/certificado-participacion.gs): las
// respuestas quedan en un Google Sheet, no en Supabase.
import { calcularFechaFin } from "@/lib/practice-dates";
import { isValidDni } from "@/lib/types";

export type Recommends = "si" | "tal_vez" | "no";

export const RECOMMENDS_LABELS: Record<Recommends, string> = {
  si: "Sí, la recomendaría",
  tal_vez: "Tal vez",
  no: "No la recomendaría",
};

// Preguntas de texto de la encuesta, en el orden en que se muestran.
// `key` es el nombre del campo que recibe el Apps Script.
export const OFFBOARDING_TEXT_QUESTIONS = [
  {
    name: "aprendio",
    label: "¿Qué aprendiste durante tus prácticas en Nexa?",
    hint: "Herramientas, habilidades, metodologías, lo que más te sirvió.",
    required: true,
  },
  {
    name: "espera",
    label: "¿Qué esperas luego de tus prácticas?",
    hint: "Tus próximos pasos: trabajo, especialización, estudios…",
    required: true,
  },
  {
    name: "meta",
    label: "¿A dónde quieres llegar profesionalmente?",
    hint: "El rol, empresa o meta que te gustaría alcanzar.",
    required: true,
  },
  {
    name: "mejoras",
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

// Datos de la pestaña Nexa de la ficha: nombre, DNI, fecha de ingreso y
// fecha de salida (si no está guardada, se calcula con la regla de 320 h).
export function buildCertificate(member: {
  full_name: string | null;
  dni: string | null;
  join_date: string | null;
  end_date?: string | null;
}): { payload: CertificatePayload | null; missing: string[] } {
  const nombre = member.full_name?.trim() || null;
  const dni = member.dni?.trim() || null;
  const inicio = member.join_date?.trim() || null;
  const fin = member.end_date?.trim() || calcularFechaFin(inicio);

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

// ---------- Llamada al Apps Script ----------

export type ScriptResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string };

const TIMEOUT_MS = Number(process.env.GOOGLE_SALIDA_SCRIPT_TIMEOUT_MS) || 9500;

// Solo en el servidor: la URL y el token nunca llegan al navegador.
export async function callSalidaScript(
  action: "estado" | "responder" | "certificado",
  body: Record<string, unknown>,
): Promise<ScriptResult> {
  const url = process.env.GOOGLE_SALIDA_SCRIPT_URL;
  if (!url) {
    console.error("[salida] falta la variable GOOGLE_SALIDA_SCRIPT_URL");
    return { ok: false, status: 503, error: "La encuesta de salida todavía no está configurada. Avisa a un administrador." };
  }
  const token = process.env.GOOGLE_SALIDA_SCRIPT_TOKEN;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({ ...body, action, ...(token ? { token } : {}) }),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    console.error("[salida] Apps Script no respondió", { action, timedOut });
    return {
      ok: false,
      status: 504,
      error: timedOut
        ? "Google tardó demasiado en responder. Inténtalo de nuevo en unos segundos."
        : "No pudimos comunicarnos con Google. Inténtalo nuevamente.",
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
    console.error("[salida] respuesta inesperada de Apps Script", { action, status: res.status });
    return { ok: false, status: 502, error: "Google no respondió correctamente. Inténtalo nuevamente." };
  }
  if (json.success !== true) {
    const reason = typeof json.error === "string" ? json.error : null;
    console.error("[salida] Apps Script devolvió error", { action, reason });
    return { ok: false, status: 502, error: reason ?? "Algo falló en Google. Inténtalo nuevamente." };
  }
  return { ok: true, data: json };
}
