"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_DESCRIPTIONS,
  AVAILABILITY_LABELS,
  AVAILABILITY_STATUSES,
  DAY_LABELS,
  HOURS,
  decodeSlot,
  encodeSlot,
  formatHourRange,
  mergeHourRanges,
  slotKey,
  type AvailabilityStatus,
} from "@/lib/types";
import Modal from "./Modal";
import Menu, { MenuItem } from "./Menu";
import { useToast } from "./Toast";

type SaveState = "idle" | "saving" | "success" | "error";

function cellsToKey(cells: Map<string, AvailabilityStatus>) {
  return Array.from(cells.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
}

function decodeInitial(slots: string[]) {
  const map = new Map<string, AvailabilityStatus>();
  for (const raw of slots) {
    const decoded = decodeSlot(raw);
    if (decoded) map.set(slotKey(decoded.day_of_week, decoded.hour), decoded.status);
  }
  return map;
}

const MORNING = HOURS.filter((h) => h < 12);
const AFTERNOON = HOURS.filter((h) => h >= 12 && h < 18);
const EVENING = HOURS.filter((h) => h >= 18);

export default function AvailabilityEditor({
  initialSlots,
  onSave,
  ownerFirstName,
}: {
  initialSlots: string[];
  onSave: (slots: string[]) => Promise<void>;
  ownerFirstName?: string;
}) {
  const selfMode = !ownerFirstName;
  const { push } = useToast();

  const initial = useMemo(() => decodeInitial(initialSlots), [initialSlots]);
  const [cells, setCells] = useState(initial);
  const [savedCells, setSavedCells] = useState(initial);
  const [started, setStarted] = useState(() => initial.size > 0);
  const [brush, setBrush] = useState<AvailabilityStatus>("libre");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dragMode, setDragMode] = useState<"paint" | "clear" | null>(null);
  const [todayIdx, setTodayIdx] = useState<number | null>(null);
  const [mobileDay, setMobileDay] = useState(0);
  const [clearModalOpen, setClearModalOpen] = useState(false);

  useEffect(() => {
    const idx = (new Date().getDay() + 6) % 7;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayIdx(idx);
    setMobileDay(idx);
  }, []);

  const dirty = useMemo(() => cellsToKey(cells) !== cellsToKey(savedCells), [cells, savedCells]);
  const hasAnyData = cells.size > 0;

  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function paint(key: string, mode: "paint" | "clear") {
    setCells((prev) => {
      const next = new Map(prev);
      if (mode === "clear") next.delete(key);
      else next.set(key, brush);
      return next;
    });
  }

  function applyToSlots(slots: { day: number; hour: number }[], status: AvailabilityStatus) {
    setCells((prev) => {
      const next = new Map(prev);
      for (const s of slots) next.set(slotKey(s.day, s.hour), status);
      return next;
    });
  }

  function applyTimeOfDayPreset(hours: number[], label: string) {
    const slots = DAY_LABELS.flatMap((_, day) => hours.map((hour) => ({ day, hour })));
    applyToSlots(slots, brush);
    push(`${label} marcado como "${AVAILABILITY_LABELS[brush]}".`, "info");
  }

  function markAllUnavailable() {
    const slots = DAY_LABELS.flatMap((_, day) => HOURS.map((hour) => ({ day, hour })));
    applyToSlots(slots, "ocupado");
    push("Semana marcada como no disponible.", "info");
  }

  function markWeekdaysAvailable() {
    const slots = [0, 1, 2, 3, 4].flatMap((day) => HOURS.map((hour) => ({ day, hour })));
    applyToSlots(slots, "libre");
    push("Lunes a viernes marcado como disponible.", "info");
  }

  function copyDayTo(fromDay: number, toDays: number[]) {
    setCells((prev) => {
      const next = new Map(prev);
      for (const toDay of toDays) {
        for (const hour of HOURS) {
          const fromStatus = prev.get(slotKey(fromDay, hour));
          const key = slotKey(toDay, hour);
          if (fromStatus) next.set(key, fromStatus);
          else next.delete(key);
        }
      }
      return next;
    });
    push(
      `Horario de ${DAY_LABELS[fromDay]} copiado a ${toDays.length === 6 ? "todos los días" : toDays.map((d) => DAY_LABELS[d]).join(", ")}.`,
      "info",
    );
  }

  async function handleSave() {
    if (saveState === "saving") return;
    setSaveState("saving");
    const snapshot = new Map(cells);
    try {
      const payload = Array.from(snapshot.entries()).map(([key, status]) => {
        const [day, hour] = key.split("-").map(Number);
        return encodeSlot(day, hour, status);
      });
      await onSave(payload);
      setSavedCells(snapshot);
      setSaveState("success");
      push("Tu horario se guardó correctamente.", "success");
      setTimeout(() => setSaveState((s) => (s === "success" ? "idle" : s)), 2500);
    } catch {
      setSaveState("error");
      push("No se pudo guardar el horario.", "error");
    }
  }

  function handleDiscard() {
    setCells(new Map(savedCells));
  }

  function handleClearConfirmed() {
    setCells(new Map());
    setClearModalOpen(false);
    push("Horario limpiado.", "info");
  }

  const rangesByDay = useMemo(() => {
    const result = new Map<number, ReturnType<typeof mergeHourRanges>>();
    for (let day = 0; day < 7; day++) {
      const forDay = new Map<number, AvailabilityStatus>();
      for (const hour of HOURS) {
        const status = cells.get(slotKey(day, hour));
        if (status) forDay.set(hour, status);
      }
      result.set(day, mergeHourRanges(forDay));
    }
    return result;
  }, [cells]);

  const subjectPossessive = selfMode ? "tu" : `de ${ownerFirstName}`;
  const subjectDative = selfMode ? "tu disponibilidad" : `la disponibilidad de ${ownerFirstName}`;

  if (!started) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-1 text-sm font-semibold text-nexa-navy dark:text-white">
          {selfMode
            ? "Configura tu disponibilidad semanal"
            : `${ownerFirstName} todavía no configuró su disponibilidad`}
        </p>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          {selfMode ? "Solo te tomará unos minutos." : "Puedes configurarla ahora en su nombre."}
        </p>
        <div className="mx-auto mb-5 flex max-w-xs flex-col gap-2 text-left text-xs text-slate-500 dark:text-slate-400">
          {["Selecciona un estado", "Pinta tus horas", "Guarda"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nexa-light text-[11px] font-semibold text-nexa-blue dark:bg-blue-950/40 dark:text-blue-300">
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="rounded-md bg-nexa-blue px-4 py-2 text-sm font-medium text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy"
        >
          {selfMode ? "Configurar mi horario" : "Configurar horario"}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            hasAnyData
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
        >
          {hasAnyData ? "✓ Disponibilidad configurada" : `Completa ${subjectDative}`}
        </span>

        <Menu
          align="right"
          trigger={
            <button
              type="button"
              aria-label="Más opciones"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              •••
            </button>
          }
        >
          {(close) => (
            <MenuItem
              danger
              onClick={() => {
                close();
                setClearModalOpen(true);
              }}
            >
              Limpiar disponibilidad
            </MenuItem>
          )}
        </Menu>
      </div>

      {/* State selector */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {AVAILABILITY_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setBrush(status)}
            aria-pressed={brush === status}
            className={`min-h-[56px] rounded-lg border px-3 py-2 text-left transition-colors ${
              brush === status
                ? "border-nexa-blue bg-nexa-light dark:border-blue-500 dark:bg-blue-950/40"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/30"
            }`}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className={`h-2.5 w-2.5 rounded-full ${AVAILABILITY_COLORS[status].split(" ")[0]}`} />
              {AVAILABILITY_LABELS[status]}
            </span>
            <span className="mt-0.5 block text-xs text-slate-400">
              {AVAILABILITY_DESCRIPTIONS[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Quick presets */}
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          ¿Cuándo sueles estar disponible? Marca con &quot;{AVAILABILITY_LABELS[brush]}&quot;:
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => applyTimeOfDayPreset(MORNING, "Mañanas")}
            className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Mañanas
          </button>
          <button
            type="button"
            onClick={() => applyTimeOfDayPreset(AFTERNOON, "Tardes")}
            className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Tardes
          </button>
          <button
            type="button"
            onClick={() => applyTimeOfDayPreset(EVENING, "Noches")}
            className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Noches
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 border-t border-slate-200 pt-2 text-xs dark:border-slate-700">
          <button type="button" onClick={markWeekdaysAvailable} className="text-nexa-blue hover:underline">
            Marcar lunes a viernes como disponible
          </button>
          <button type="button" onClick={markAllUnavailable} className="text-slate-400 hover:underline">
            Marcar todo como no disponible
          </button>
        </div>
      </div>

      {/* Desktop grid */}
      <div
        className="mb-4 hidden select-none overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/30 md:block"
        onMouseLeave={() => setDragMode(null)}
        onMouseUp={() => setDragMode(null)}
      >
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="w-16"></th>
              {DAY_LABELS.map((d, i) => (
                <th key={d} className="pb-2 text-center">
                  <div className="mx-auto flex w-16 flex-col items-center gap-0.5">
                    <div
                      className={`flex w-full flex-col items-center rounded-lg px-1 py-1 ${
                        todayIdx === i
                          ? "bg-amber-400 text-nexa-navy dark:bg-amber-500 dark:text-slate-900"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wide">
                        {d.slice(0, 3)}
                      </span>
                    </div>
                    <Menu
                      align="right"
                      trigger={
                        <button
                          type="button"
                          aria-label={`Más acciones para ${d}`}
                          className="text-[10px] font-normal normal-case text-slate-300 hover:text-nexa-blue dark:text-slate-600 dark:hover:text-blue-300"
                        >
                          •••
                        </button>
                      }
                    >
                      {(close) => (
                        <>
                          <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Copiar {d} a
                          </div>
                          {DAY_LABELS.map((target, j) =>
                            j === i ? null : (
                              <MenuItem
                                key={target}
                                onClick={() => {
                                  copyDayTo(i, [j]);
                                  close();
                                }}
                              >
                                {target}
                              </MenuItem>
                            ),
                          )}
                          <MenuItem
                            onClick={() => {
                              copyDayTo(
                                i,
                                DAY_LABELS.map((_, j) => j).filter((j) => j !== i),
                              );
                              close();
                            }}
                          >
                            Todos los días
                          </MenuItem>
                        </>
                      )}
                    </Menu>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h, rowIdx) => (
              <tr key={h}>
                <td
                  className={`w-16 pr-2 text-right align-top text-[11px] font-medium text-slate-400 ${
                    rowIdx === 0 ? "" : "border-t border-dashed border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {String(h).padStart(2, "0")}:00
                </td>
                {DAY_LABELS.map((_, dayIdx) => {
                  const key = slotKey(dayIdx, h);
                  const status = cells.get(key);
                  return (
                    <td
                      key={key}
                      data-day={dayIdx}
                      data-hour={h}
                      onMouseDown={() => {
                        const mode = status === brush ? "clear" : "paint";
                        setDragMode(mode);
                        paint(key, mode);
                      }}
                      onMouseEnter={() => {
                        if (dragMode) paint(key, dragMode);
                      }}
                      className={`h-9 w-16 cursor-pointer border-l border-slate-100 dark:border-slate-800 ${
                        rowIdx === 0 ? "" : "border-t border-dashed border-slate-200 dark:border-slate-700"
                      } ${todayIdx === dayIdx ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}
                    >
                      {status && (
                        <div
                          className={`m-0.5 h-[calc(100%-4px)] rounded-md transition-colors ${AVAILABILITY_COLORS[status]}`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one day at a time, tap to paint */}
      <div className="mb-4 md:hidden">
        <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
          {DAY_LABELS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setMobileDay(i)}
              className={`min-h-[40px] min-w-[44px] shrink-0 rounded-md px-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                mobileDay === i
                  ? "bg-nexa-blue text-white"
                  : todayIdx === i
                    ? "bg-amber-400 text-nexa-navy dark:bg-amber-500 dark:text-slate-900"
                    : "bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs text-slate-400">
          Toca una hora para marcarla como &quot;{AVAILABILITY_LABELS[brush]}&quot;.
        </p>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900/30">
          {HOURS.map((h) => {
            const key = slotKey(mobileDay, h);
            const status = cells.get(key);
            return (
              <button
                key={h}
                type="button"
                onClick={() => paint(key, status === brush ? "clear" : "paint")}
                className="flex min-h-[44px] w-full items-center justify-between px-4 py-2 text-left text-sm"
              >
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {String(h).padStart(2, "0")}:00
                </span>
                {status ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className={`h-2.5 w-2.5 rounded-full ${AVAILABILITY_COLORS[status].split(" ")[0]}`} />
                    {AVAILABILITY_LABELS[status]}
                  </span>
                ) : (
                  <span className="text-xs text-slate-300 dark:text-slate-600">Sin marcar</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live summary */}
      {hasAnyData && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-nexa-navy dark:text-white">
            {selfMode ? "Tu disponibilidad" : `Disponibilidad ${subjectPossessive}`}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DAY_LABELS.map((d, day) => {
              const ranges = rangesByDay.get(day) ?? [];
              if (ranges.length === 0) return null;
              return (
                <div key={d}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {d.slice(0, 3)}
                  </p>
                  <ul className="space-y-1">
                    {ranges.map((r) => (
                      <li key={`${r.startHour}-${r.status}`} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${AVAILABILITY_COLORS[r.status].split(" ")[0]}`} />
                        {formatHourRange(r.startHour, r.endHour)}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      {dirty && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 sm:rounded-lg sm:border">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Cambios sin guardar
          </span>
          <div className="flex items-center gap-2">
            {saveState === "error" && (
              <span className="text-xs text-red-500 dark:text-red-400">No se pudo guardar.</span>
            )}
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saveState === "saving"}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/40"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === "saving"}
              className="inline-flex items-center gap-2 rounded-md bg-nexa-blue px-3.5 py-1.5 text-sm font-medium text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saveState === "saving" && (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {saveState === "saving" ? "Guardando..." : "Guardar disponibilidad"}
            </button>
          </div>
        </div>
      )}
      {!dirty && saveState === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ Disponibilidad actualizada</p>
      )}

      <Modal open={clearModalOpen} onClose={() => setClearModalOpen(false)} title="Limpiar disponibilidad">
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          ¿Limpiar toda {subjectDative}? Se eliminará la configuración actual de esta semana.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setClearModalOpen(false)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleClearConfirmed}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Limpiar
          </button>
        </div>
      </Modal>
    </div>
  );
}
