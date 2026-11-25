"use client";

import { useEffect, useRef, useState } from "react";
import { OFFBOARDING_TEXT_QUESTIONS, RECOMMENDS_LABELS, ratingLabel, type Recommends } from "@/lib/offboarding";

// Lo único que ve un integrante cuando el admin activó su salida: un
// agradecimiento, la encuesta de salida y, al enviarla, la descarga de su
// certificado de participación.

const TEXTAREA =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const LABEL = "block text-sm font-semibold text-slate-800 dark:text-slate-100";
const HINT = "mt-0.5 text-xs text-slate-500 dark:text-slate-400";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function RatingScale() {
  const [value, setValue] = useState<number | null>(null);
  return (
    <fieldset>
      <legend className={LABEL}>
        ¿Cómo sentiste el ambiente laboral en Nexa? <span className="text-red-500">*</span>
      </legend>
      <p className={HINT}>1 es muy malo y 10 es muy bueno.</p>
      <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name="ambiente"
              value={n}
              required
              className="peer sr-only"
              onChange={() => setValue(n)}
            />
            <span className="flex h-11 items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 transition-colors peer-checked:border-nexa-blue peer-checked:bg-nexa-blue peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-nexa-blue/40 hover:border-nexa-blue/50 dark:border-slate-700 dark:text-slate-300">
              {n}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate-400">
        <span>Muy malo</span>
        <span className="font-medium text-nexa-blue dark:text-blue-300">{value ? ratingLabel(value) : ""}</span>
        <span>Muy bueno</span>
      </div>
    </fieldset>
  );
}

function Survey({ onDone }: { onDone: () => void }) {
  const [recommends, setRecommends] = useState<Recommends | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/salida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "No pudimos enviar tus respuestas. Inténtalo nuevamente.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar tus respuestas.");
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <RatingScale />

      {OFFBOARDING_TEXT_QUESTIONS.map((q) => (
        <div key={q.name}>
          <label htmlFor={`ob-${q.name}`} className={LABEL}>
            {q.label} {q.required && <span className="text-red-500">*</span>}
          </label>
          <p className={HINT}>{q.hint}</p>
          <textarea id={`ob-${q.name}`} name={q.name} required={q.required} rows={3} maxLength={4000} className={`${TEXTAREA} mt-2`} />
        </div>
      ))}

      <fieldset>
        <legend className={LABEL}>
          ¿Recomendarías Nexa Consulting TI para iniciar prácticas? <span className="text-red-500">*</span>
        </legend>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(Object.keys(RECOMMENDS_LABELS) as Recommends[]).map((r) => (
            <label key={r} className="cursor-pointer">
              <input type="radio" name="recomienda" value={r} required className="peer sr-only" onChange={() => setRecommends(r)} />
              <span className="flex h-11 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors peer-checked:border-nexa-blue peer-checked:bg-nexa-light peer-checked:text-nexa-blue peer-focus-visible:ring-2 peer-focus-visible:ring-nexa-blue/40 hover:border-nexa-blue/50 dark:border-slate-700 dark:text-slate-300 dark:peer-checked:bg-blue-950/50 dark:peer-checked:text-blue-200">
                {RECOMMENDS_LABELS[r]}
              </span>
            </label>
          ))}
        </div>
        {recommends && (
          <div className="mt-3">
            <label htmlFor="ob-porque" className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ¿Por qué? (opcional)
            </label>
            <textarea id="ob-porque" name="porque" rows={2} maxLength={4000} className={`${TEXTAREA} mt-1`} />
          </div>
        )}
      </fieldset>

      <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-700">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-nexa-blue px-6 text-sm font-semibold text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {sending ? (
            <>
              <Spinner /> Enviando…
            </>
          ) : (
            "Enviar respuestas"
          )}
        </button>
      </div>
    </form>
  );
}

function CertificateDownload() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const download = async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/certificado", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No pudimos generar tu certificado. Inténtalo nuevamente.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = /filename\*=UTF-8''([^;]+)/.exec(disposition);
      const name = match ? decodeURIComponent(match[1]) : "Certificado de participación - Nexa.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos generar tu certificado.");
      setStatus("error");
    } finally {
      busy.current = false;
    }
  };

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
        ✓
      </div>
      <div>
        <p className="text-lg font-semibold text-nexa-navy dark:text-white">¡Gracias por tus respuestas!</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ya puedes descargar tu certificado de participación aquí.
        </p>
      </div>
      <button
        type="button"
        onClick={download}
        disabled={status === "loading"}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-nexa-blue px-6 text-sm font-semibold text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? (
          <>
            <Spinner /> Generando tu certificado…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
            </svg>
            {status === "done" ? "Descargar de nuevo" : "Descargar mi certificado"}
          </>
        )}
      </button>
      {status === "done" && <p className="text-xs text-slate-500 dark:text-slate-400">Listo, revisa tus descargas.</p>}
      {error && (
        <p className="mx-auto max-w-md rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export default function OffboardingScreen({ firstName }: { firstName: string }) {
  // null = consultando si ya respondió la encuesta.
  const [done, setDone] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/salida", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.ok) setDone(data.respondido === true);
        else setLoadError(data?.error ?? "No pudimos cargar la encuesta. Recarga la página.");
      })
      .catch(() => !cancelled && setLoadError("No hay conexión con el servidor. Recarga la página."));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="bg-nexa-navy px-6 py-8 text-center text-white sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nexa-sky">Nexa Consulting TI</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">¡Gracias por participar en Nexa{firstName ? `, ${firstName}` : ""}!</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-blue-100">
            {done
              ? "Fue un gusto tenerte en el equipo. Te deseamos lo mejor en lo que viene."
              : "Fue un gusto tenerte en el equipo. Antes de tu certificado, cuéntanos cómo te fue: tus respuestas nos ayudan a mejorar."}
          </p>
        </div>
        <div className="px-6 py-8 sm:px-10">
          {loadError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {loadError}
            </p>
          ) : done === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
              <Spinner /> Cargando…
            </div>
          ) : done ? (
            <CertificateDownload />
          ) : (
            <Survey onDone={() => setDone(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
