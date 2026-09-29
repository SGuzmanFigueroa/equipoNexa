"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import type { LetterPreview } from "@/lib/acceptance-letter";

// Flujo "Generar carta" (misma función desde la tabla y desde la ficha):
// pide al servidor los datos reales del integrante por su id, confirma y
// genera. El navegador nunca manda datos personales, solo integranteId.

type Result = {
  documentUrl: string;
  nombreArchivo: string | null;
  nombreCompleto: string;
  fechaInicio: string;
  fechaFin: string;
};

type State =
  | { step: "loading" }
  | { step: "missing"; preview: LetterPreview }
  | { step: "confirm"; preview: LetterPreview }
  | { step: "generating"; preview: LetterPreview }
  | { step: "done"; result: Result }
  | { step: "error"; message: string; preview?: LetterPreview; missing?: string[] };

const GENERIC_ERROR = "No pudimos generar la carta. Inténtalo nuevamente.";

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-700 dark:text-slate-200">{value}</dd>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

const BTN_SECONDARY =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50";
const BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-nexa-blue px-4 text-sm font-medium text-white shadow-sm shadow-nexa-blue/20 transition-colors hover:bg-nexa-navy disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-blue-700";

function MissingList({ memberId, missing, onClose }: { memberId: string; missing: string[]; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-semibold">No se puede generar la carta</p>
        <p className="mt-1">Faltan los siguientes datos:</p>
        <ul className="mt-1 list-disc pl-5">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={BTN_SECONDARY}>
          Cancelar
        </button>
        <Link href={`/members/${memberId}#informacion`} onClick={onClose} className={BTN_PRIMARY}>
          Editar integrante
        </Link>
      </div>
    </div>
  );
}

export default function GenerateLetterDialog({
  memberId,
  open,
  onClose,
}: {
  memberId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>({ step: "loading" });
  const busy = useRef(false);

  const load = useCallback(async (id: string) => {
    setState({ step: "loading" });
    try {
      const res = await fetch(`/api/generar-carta?integranteId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await readJson(res);
      if (!res.ok || !data?.ok) {
        setState({ step: "error", message: data?.error ?? GENERIC_ERROR });
        return;
      }
      const preview = data.preview as LetterPreview;
      setState(preview.missing.length > 0 ? { step: "missing", preview } : { step: "confirm", preview });
    } catch {
      setState({ step: "error", message: "No hay conexión con el servidor. Revisa tu internet e inténtalo nuevamente." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga los datos del integrante al abrir
    if (open && memberId) load(memberId);
  }, [open, memberId, load]);

  const generate = async (preview: LetterPreview) => {
    if (busy.current) return; // doble clic
    busy.current = true;
    setState({ step: "generating", preview });
    try {
      const res = await fetch("/api/generar-carta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integranteId: preview.memberId }),
      });
      const data = await readJson(res);
      if (res.ok && data?.ok) {
        setState({ step: "done", result: data as Result });
      } else if (Array.isArray(data?.missing) && data.missing.length > 0) {
        setState({ step: "missing", preview: { ...preview, missing: data.missing } });
      } else {
        setState({ step: "error", message: data?.error ?? GENERIC_ERROR, preview });
      }
    } catch {
      setState({ step: "error", message: "No hay conexión con el servidor. Revisa tu internet e inténtalo nuevamente.", preview });
    } finally {
      busy.current = false;
    }
  };

  // No se puede cerrar a mitad de la generación (evita perder el resultado).
  const close = () => {
    if (state.step !== "generating") onClose();
  };

  const title = state.step === "done" ? "Carta generada" : "Generar carta de aceptación";

  return (
    <Modal open={open} onClose={close} title={title} size="md">
      {state.step === "loading" && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
          <Spinner /> Cargando datos del integrante…
        </div>
      )}

      {state.step === "missing" && <MissingList memberId={state.preview.memberId} missing={state.preview.missing} onClose={onClose} />}

      {(state.step === "confirm" || state.step === "generating") && (
        <div className="space-y-4">
          <p className="text-base font-semibold text-nexa-navy dark:text-white">{state.preview.nombreCompleto}</p>
          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-3 dark:divide-slate-700 dark:border-slate-700">
            <Row label="DNI" value={state.preview.dni} />
            <Row label="Carrera" value={state.preview.carrera} />
            <Row label="Universidad" value={state.preview.universidad} />
            <Row label="Inicio" value={state.preview.fechaInicio} />
            <Row label="Fin" value={state.preview.fechaFin} />
          </dl>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            La carta se generará utilizando estos datos. La fecha fin se calcula con 320 h, 6 h por día, de lunes a
            viernes sin feriados.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} disabled={state.step === "generating"} className={`${BTN_SECONDARY} disabled:opacity-50`}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => generate(state.preview)}
              disabled={state.step === "generating"}
              className={BTN_PRIMARY}
            >
              {state.step === "generating" ? (
                <>
                  <Spinner /> Generando...
                </>
              ) : (
                "Generar carta"
              )}
            </button>
          </div>
        </div>
      )}

      {state.step === "done" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-emerald-50 px-3 py-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm text-white">
              ✓
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">Carta generada correctamente</p>
              <p className="mt-1 font-medium">{state.result.nombreCompleto}</p>
              <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">
                Inicio: {state.result.fechaInicio} · Fin: {state.result.fechaFin}
              </p>
              {state.result.nombreArchivo && (
                <p className="mt-1 truncate text-xs text-emerald-700/80 dark:text-emerald-300/80">{state.result.nombreArchivo}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={BTN_SECONDARY}>
              Cerrar
            </button>
            <a href={state.result.documentUrl} target="_blank" rel="noopener noreferrer" className={BTN_PRIMARY}>
              Ver documento
            </a>
          </div>
        </div>
      )}

      {state.step === "error" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <p className="font-semibold">No pudimos generar la carta.</p>
            <p className="mt-1">{state.message}</p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={BTN_SECONDARY}>
              Cerrar
            </button>
            {state.preview && (
              <button type="button" onClick={() => setState({ step: "confirm", preview: state.preview! })} className={BTN_PRIMARY}>
                Intentar de nuevo
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// Botón para la ficha del integrante.
export function GenerateLetterButton({ memberId }: { memberId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-nexa-blue/30 bg-white px-3 text-sm font-medium text-nexa-blue transition-colors hover:bg-nexa-light dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
        Generar carta
      </button>
      <GenerateLetterDialog memberId={memberId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
