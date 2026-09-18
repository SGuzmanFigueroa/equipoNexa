"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  AVAILABILITY_STATUSES,
  DAY_LABELS,
  HOURS,
  decodeSlot,
  encodeSlot,
  slotKey,
  type AvailabilityStatus,
} from "@/lib/types";

type SaveState = "idle" | "saving" | "success" | "error";

function cellsToKey(cells: Map<string, AvailabilityStatus>) {
  return Array.from(cells.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
}

export default function AvailabilityGrid({
  initialSlots,
  onSave,
}: {
  initialSlots: string[];
  onSave: (slots: string[]) => Promise<void>;
}) {
  const initial = new Map<string, AvailabilityStatus>();
  for (const raw of initialSlots) {
    const decoded = decodeSlot(raw);
    if (decoded) initial.set(slotKey(decoded.day_of_week, decoded.hour), decoded.status);
  }

  const [cells, setCells] = useState<Map<string, AvailabilityStatus>>(initial);
  const [brush, setBrush] = useState<AvailabilityStatus>("libre");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dragMode, setDragMode] = useState<"paint" | "clear" | null>(null);
  const [todayIdx, setTodayIdx] = useState<number | null>(null);
  const [copyFrom, setCopyFrom] = useState(0);
  const [copyTo, setCopyTo] = useState(1);
  const [lastSavedKey, setLastSavedKey] = useState(() => cellsToKey(initial));
  const isSavingRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayIdx((new Date().getDay() + 6) % 7);
  }, []);

  const dirty = useMemo(() => cellsToKey(cells) !== lastSavedKey, [cells, lastSavedKey]);

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

  async function handleSave() {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveState("saving");
    const snapshot = new Map(cells);
    try {
      const payload = Array.from(snapshot.entries()).map(([key, status]) => {
        const [day, hour] = key.split("-").map(Number);
        return encodeSlot(day, hour, status);
      });
      await onSave(payload);
      setLastSavedKey(cellsToKey(snapshot));
      setSaveState("success");
      setTimeout(() => setSaveState((s) => (s === "success" ? "idle" : s)), 2500);
    } catch {
      setSaveState("error");
    } finally {
      isSavingRef.current = false;
    }
  }

  function handleClear() {
    if (cells.size === 0) return;
    if (!window.confirm("¿Borrar todo tu horario? Esta acción no se puede deshacer.")) return;
    setCells(new Map());
  }

  function applyMondayToWeekdays() {
    setCells((prev) => {
      const next = new Map(prev);
      for (const hour of HOURS) {
        const mondayStatus = prev.get(slotKey(0, hour));
        for (let day = 1; day <= 4; day++) {
          const key = slotKey(day, hour);
          if (mondayStatus) next.set(key, mondayStatus);
          else next.delete(key);
        }
      }
      return next;
    });
  }

  function copyDay() {
    if (copyFrom === copyTo) return;
    setCells((prev) => {
      const next = new Map(prev);
      for (const hour of HOURS) {
        const fromStatus = prev.get(slotKey(copyFrom, hour));
        const key = slotKey(copyTo, hour);
        if (fromStatus) next.set(key, fromStatus);
        else next.delete(key);
      }
      return next;
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Disponibilidad:
        </span>
        {AVAILABILITY_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setBrush(status)}
            aria-pressed={brush === status}
            className={`flex min-h-[36px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              brush === status
                ? "border-nexa-blue bg-nexa-light dark:border-blue-500 dark:bg-blue-950/40"
                : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <span className={`h-3 w-3 rounded-sm ${AVAILABILITY_COLORS[status].split(" ")[0]}`} />
            {AVAILABILITY_LABELS[status]}
          </button>
        ))}
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Selecciona un estado y haz clic o arrastra sobre las horas. Clic de nuevo sobre una celda
        pintada para borrarla.
      </p>

      <div
        className="overflow-x-auto select-none rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/40"
        onMouseLeave={() => setDragMode(null)}
        onMouseUp={() => setDragMode(null)}
      >
        <table className="w-full min-w-[680px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="w-16"></th>
              {DAY_LABELS.map((d, i) => (
                <th key={d} className="pb-2 text-center">
                  <div
                    className={`mx-auto flex w-14 flex-col items-center rounded-lg px-1 py-1 ${
                      todayIdx === i
                        ? "bg-amber-400 text-nexa-navy dark:bg-amber-500 dark:text-slate-900"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <span className="text-[11px] font-medium uppercase tracking-wide">
                      {d.slice(0, 3)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h, rowIdx) => (
              <tr key={h}>
                <td
                  className={`w-16 pr-2 text-right align-top text-[11px] font-medium text-amber-600 dark:text-amber-400 ${
                    rowIdx === 0 ? "" : "border-t border-dashed border-slate-300 dark:border-slate-700"
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
                      onMouseDown={() => {
                        const mode = status === brush ? "clear" : "paint";
                        setDragMode(mode);
                        paint(key, mode);
                      }}
                      onMouseEnter={() => {
                        if (dragMode) paint(key, dragMode);
                      }}
                      className={`h-8 w-14 cursor-pointer border-l border-slate-200 dark:border-slate-700 ${
                        rowIdx === 0 ? "" : "border-t border-dashed border-slate-300 dark:border-slate-700"
                      } ${
                        todayIdx === dayIdx ? "bg-amber-50/60 dark:bg-amber-950/10" : ""
                      }`}
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

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-700">
        <button
          type="button"
          onClick={applyMondayToWeekdays}
          className="rounded-md border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/40"
        >
          Aplicar lunes a lunes-viernes
        </button>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Copiar</span>
          <select
            value={copyFrom}
            onChange={(e) => setCopyFrom(Number(e.target.value))}
            className="rounded-md border border-slate-200 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {DAY_LABELS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <span className="text-slate-400">a</span>
          <select
            value={copyTo}
            onChange={(e) => setCopyTo(Number(e.target.value))}
            className="rounded-md border border-slate-200 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {DAY_LABELS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={copyDay}
            className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/40"
          >
            Copiar
          </button>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md border border-red-200 px-2.5 py-1.5 font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20"
        >
          Limpiar horario
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === "saving"}
          className="inline-flex items-center gap-2 rounded-md bg-nexa-blue px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saveState === "saving" && (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {saveState === "saving" ? "Guardando..." : "Guardar cambios"}
        </button>

        {saveState === "success" && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            ✓ Horario guardado
          </span>
        )}
        {saveState === "error" && (
          <span className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            No se pudo guardar el horario.
            <button type="button" onClick={handleSave} className="font-medium underline">
              Reintentar
            </button>
          </span>
        )}
        {saveState === "idle" && dirty && (
          <span className="text-xs text-amber-600 dark:text-amber-400">Cambios sin guardar</span>
        )}
      </div>
    </div>
  );
}
