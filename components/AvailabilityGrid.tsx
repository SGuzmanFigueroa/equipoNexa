"use client";

import { useState, useTransition } from "react";
import { DAY_LABELS, HOURS, slotKey } from "@/lib/types";

export default function AvailabilityGrid({
  initialSlots,
  onSave,
}: {
  initialSlots: string[];
  onSave: (slots: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSlots));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove" | null>(null);

  function toggle(key: string, forceAdd?: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      const shouldAdd = forceAdd ?? !next.has(key);
      if (shouldAdd) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      await onSave(Array.from(selected));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div>
      <div
        className="overflow-x-auto select-none"
        onMouseLeave={() => setDragMode(null)}
        onMouseUp={() => setDragMode(null)}
      >
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-16 border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"></th>
              {DAY_LABELS.map((d) => (
                <th
                  key={d}
                  className="border border-slate-200 bg-nexa-light/50 p-1 font-medium text-nexa-navy/80 dark:border-slate-700 dark:bg-slate-700/40 dark:text-slate-300"
                >
                  {d.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h}>
                <td className="border border-slate-200 bg-nexa-light/50 p-1 text-center font-medium text-nexa-navy/80 dark:border-slate-700 dark:bg-slate-700/40 dark:text-slate-300">
                  {String(h).padStart(2, "0")}:00
                </td>
                {DAY_LABELS.map((_, dayIdx) => {
                  const key = slotKey(dayIdx, h);
                  const isOn = selected.has(key);
                  return (
                    <td
                      key={key}
                      onMouseDown={() => {
                        const mode = isOn ? "remove" : "add";
                        setDragMode(mode);
                        toggle(key, mode === "add");
                      }}
                      onMouseEnter={() => {
                        if (dragMode) toggle(key, dragMode === "add");
                      }}
                      className={`h-6 w-14 cursor-pointer border border-slate-200 transition-colors dark:border-slate-700 ${
                        isOn
                          ? "bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-500"
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

      <div className="mt-3 flex items-center gap-3">
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
          Clic para marcar/desmarcar, o mantén presionado y arrastra.
        </span>
      </div>
    </div>
  );
}
