"use client";

import { useState, useTransition } from "react";
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
        className="overflow-x-auto select-none"
        onMouseLeave={() => setDragMode(null)}
        onMouseUp={() => setDragMode(null)}
      >
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-16 border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"></th>
              {DAY_LABELS.map((d) => (
                <th
                  key={d}
                  className="border border-slate-200 bg-nexa-light/60 p-2 font-semibold text-nexa-navy dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-200"
                >
                  {d.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h}>
                <td className="border border-slate-200 bg-nexa-light/40 p-1 text-center font-medium text-nexa-navy/80 dark:border-slate-700 dark:bg-slate-700/30 dark:text-slate-300">
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
                      className={`h-7 w-14 cursor-pointer border border-slate-200 transition-colors dark:border-slate-700 ${
                        status
                          ? AVAILABILITY_COLORS[status]
                          : "bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                      }`}
                    />
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
