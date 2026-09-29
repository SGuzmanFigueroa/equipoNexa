"use client";

import { useState } from "react";
import { PRACTICE_HOURS_PER_DAY, PRACTICE_TOTAL_HOURS, calcularFechaFin } from "@/lib/practice-dates";

// Fecha de ingreso + Fecha de salida de prácticas. La de salida se calcula
// sola (320 h, 6 h/día, lunes a viernes sin feriados nacionales) y es de
// solo lectura; el servidor la vuelve a calcular antes de guardar.
// Devuelve dos celdas sueltas para encajar en la grilla del formulario.
export default function PracticeDateFields({
  defaultStart,
  startDisabled = false,
  startRequired = false,
  startLabel,
  startHint,
  endLabel = "Fecha de salida",
  inputClass,
  labelClass,
}: {
  defaultStart: string | null;
  startDisabled?: boolean;
  startRequired?: boolean;
  startLabel: React.ReactNode;
  startHint?: React.ReactNode;
  endLabel?: React.ReactNode;
  inputClass: string;
  labelClass: string;
}) {
  const [start, setStart] = useState(defaultStart ?? "");
  const end = calcularFechaFin(start) ?? "";

  return (
    <>
      <div>
        <label className={labelClass}>{startLabel}</label>
        <input
          name="join_date"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          disabled={startDisabled}
          required={startRequired}
          className={inputClass}
        />
        {startHint && <p className="mt-1 text-xs text-slate-400">{startHint}</p>}
      </div>
      <div>
        <label className={labelClass}>
          {endLabel} <span className="text-xs text-slate-400">(automática)</span>
        </label>
        <input
          name="end_date"
          type="date"
          value={end}
          readOnly
          tabIndex={-1}
          className={`${inputClass} cursor-default bg-slate-50 dark:bg-slate-800`}
        />
        <p className="mt-1 text-xs text-slate-400">
          {PRACTICE_TOTAL_HOURS} h a {PRACTICE_HOURS_PER_DAY} h/día, lunes a viernes sin feriados.
        </p>
      </div>
    </>
  );
}
