"use client";

import { useEffect, useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [dragMode, setDragMode] = useState<"paint" | "clear" | null>(null);
  const [todayIdx, setTodayIdx] = useState<number | null>(null);

  useEffect(() => {
    // Client-only: which weekday column is "hoy" (0=Lunes..6=Domingo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayIdx((new Date().getDay() + 6) % 7);
  }, []);

  function paint(key: string, mode: "paint" | "clear") {
    setCells((prev) => {
      const next = new Map(prev);
      if (mode === "clear") next.delete(key);
      else next.set(key, brush);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const payload = Array.from(cells.entries()).map(([key, status]) => {
        const [day, hour] = key.split("-").map(Number);
        return encodeSlot(day, hour, status);
      });
      await onSave(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Marcar como:
        </span>
        {AVAILABILITY_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setBrush(status)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              brush === status
                ? "border-nexa-blue bg-nexa-light dark:border-blue-500 dark:bg-blue-950/40"
                : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <span className={`h-3 w-3 rounded-sm ${AVAILABILITY_COLORS[status].split(" ")[0]}`} />
            {AVAILABILITY_LABELS[status]}
          </button>
        ))}
        <span className="text-xs text-slate-400">(clic de nuevo sobre una celda para borrarla)</span>
      </div>

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

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-nexa-blue px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Guardando..." : "Guardar horario"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Horario guardado.
          </span>
        )}
        <span className="text-xs text-slate-400">
          Elige un color arriba, luego clic (o clic y arrastra) sobre la grilla.
        </span>
      </div>
    </div>
  );
}
