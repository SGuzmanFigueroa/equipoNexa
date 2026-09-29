// Llamada al Web App de Google Apps Script que genera la carta. Solo se usa
// en el servidor (app/api/generar-carta): la URL nunca llega al navegador.
import type { LetterPayload } from "@/lib/acceptance-letter";

export type AppsScriptResult =
  | { ok: true; documentUrl: string; nombreArchivo: string | null }
  | { ok: false; status: number; error: string };

function isSafeDocUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "docs.google.com" || url.hostname === "drive.google.com");
  } catch {
    return false;
  }
}

// Solo se registran datos técnicos (nunca DNI ni nombres).
function logError(message: string, details: Record<string, unknown>) {
  console.error(`[generar-carta] ${message}`, details);
}

export async function callAppsScript(
  payload: LetterPayload,
  { url, token, timeoutMs, logContext = {} }: { url: string; token?: string; timeoutMs: number; logContext?: Record<string, unknown> },
): Promise<AppsScriptResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Apps Script responde con un 302 hacia googleusercontent.com: fetch
      // lo sigue y ahí está el JSON devuelto por ContentService.
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify(token ? { ...payload, token } : payload),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    logError("Apps Script no respondió", { ...logContext, timedOut });
    return {
      ok: false,
      status: 504,
      error: timedOut
        ? "Google Docs tardó demasiado en responder. Revisa en Drive si la carta se creó antes de intentarlo de nuevo."
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
    logError("respuesta inesperada de Apps Script", {
      ...logContext,
      status: res.status,
      contentType: res.headers.get("content-type"),
    });
    return {
      ok: false,
      status: 502,
      error: text.trimStart().startsWith("<")
        ? "Google Docs no respondió correctamente. Revisa que el Apps Script esté publicado con acceso para «Cualquier persona» y que su doPost devuelva JSON."
        : "Google Docs no respondió correctamente. Inténtalo nuevamente.",
    };
  }

  if (json.success !== true) {
    const reason = typeof json.error === "string" ? json.error : typeof json.message === "string" ? json.message : null;
    logError("Apps Script devolvió success=false", logContext);
    return {
      ok: false,
      status: 502,
      error: reason ? `Error al generar el documento: ${reason}` : "No pudimos generar la carta. Inténtalo nuevamente.",
    };
  }

  if (!isSafeDocUrl(json.documentUrl)) {
    logError("Apps Script no devolvió un documentUrl válido", logContext);
    return {
      ok: false,
      status: 502,
      error: "La carta se generó pero Google no devolvió el enlace del documento. Búscala en Drive.",
    };
  }

  return {
    ok: true,
    documentUrl: json.documentUrl,
    nombreArchivo: typeof json.nombreArchivo === "string" ? json.nombreArchivo : null,
  };
}
