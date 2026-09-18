"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InitialsAvatar from "./Avatar";
import EmptyState from "./EmptyState";
import {
  AVAILABILITY_LABELS,
  DAY_LABELS,
  HOURS,
  slotKey,
  type AvailabilityStatus,
  type MemberStatus,
} from "@/lib/types";

export type ScheduleMember = {
  id: string;
  full_name: string;
  status: MemberStatus;
  hasSchedule: boolean;
  projectCodes: string[];
};

export type AvailabilityRow = {
  member_id: string;
  day_of_week: number;
  hour: number;
  status: AvailabilityStatus;
};

type CellCategory = "libre" | "tentativo" | "ocupado" | "sinDatos";

type SlotStat = {
  libre: number;
  tentativo: number;
  ocupado: number;
  sinDatos: number;
  names: Record<CellCategory, string[]>;
};

// Green shades read "how available", not just "available/not" — three steps
// inside each of the 3 semantic colors so 2/20 and 9/20 don't look identical.
const LIBRE_SHADES = [
  "bg-emerald-200 dark:bg-emerald-800/50",
  "bg-emerald-400 dark:bg-emerald-600/70",
  "bg-emerald-500 dark:bg-emerald-500",
];
const TENTATIVO_SHADES = [
  "bg-amber-100 dark:bg-amber-950/30",
  "bg-amber-200 dark:bg-amber-800/50",
  "bg-amber-300 dark:bg-amber-700/60",
];
const OCUPADO_CLASS = "bg-red-300 dark:bg-red-800/60";
const NEUTRAL_CLASS = "bg-slate-100 dark:bg-slate-800/60";

function cellClass(ratio: number | null) {
  if (ratio === null) return NEUTRAL_CLASS;
  if (ratio === 0) return OCUPADO_CLASS;
  if (ratio < 0.5) {
    const step = Math.min(2, Math.floor((ratio / 0.5) * 3));
    return TENTATIVO_SHADES[step];
  }
  const step = Math.min(2, Math.floor(((ratio - 0.5) / 0.5) * 3));
  return LIBRE_SHADES[step];
}

export default function ScheduleView({
  members,
  availability,
  projects,
}: {
  members: ScheduleMember[];
  availability: AvailabilityRow[];
  projects: { code: string; name: string }[];
}) {
  const withScheduleCount = useMemo(() => members.filter((m) => m.hasSchedule).length, [members]);
  const missingMembers = useMemo(() => members.filter((m) => !m.hasSchedule), [members]);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "con" | "sin">("todos");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(members.filter((m) => m.hasSchedule).map((m) => m.id)),
  );
  const [showMissing, setShowMissing] = useState(false);
  const [openCell, setOpenCell] = useState<string | null>(null);
  const [todayIdx, setTodayIdx] = useState<number | null>(null);
  const [mobileDay, setMobileDay] = useState(0);

  useEffect(() => {
    const idx = (new Date().getDay() + 6) % 7;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayIdx(idx);
    setMobileDay(idx);
  }, []);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (q && !m.full_name.toLowerCase().includes(q)) return false;
      if (projectFilter && !m.projectCodes.includes(projectFilter)) return false;
      if (statusFilter === "con" && !m.hasSchedule) return false;
      if (statusFilter === "sin" && m.hasSchedule) return false;
      return true;
    });
  }, [members, search, projectFilter, statusFilter]);

  const byMemberSlot = useMemo(() => {
    const map = new Map<string, Map<string, AvailabilityStatus>>();
    for (const row of availability) {
      let inner = map.get(row.member_id);
      if (!inner) {
        inner = new Map();
        map.set(row.member_id, inner);
      }
      inner.set(slotKey(row.day_of_week, row.hour), row.status);
    }
    return map;
  }, [availability]);

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const selectedConfiguredIds = useMemo(
    () => Array.from(selected).filter((id) => membersById.get(id)?.hasSchedule),
    [selected, membersById],
  );

  const slotStats = useMemo(() => {
    const map = new Map<string, SlotStat>();
    for (const day of DAY_LABELS.map((_, i) => i)) {
      for (const hour of HOURS) {
        const key = slotKey(day, hour);
        const names: Record<CellCategory, string[]> = {
          libre: [],
          tentativo: [],
          ocupado: [],
          sinDatos: [],
        };
        for (const id of selectedConfiguredIds) {
          const status = byMemberSlot.get(id)?.get(key);
          const member = membersById.get(id);
          if (!member) continue;
          const category: CellCategory = status ?? "sinDatos";
          names[category].push(member.full_name);
        }
        map.set(key, {
          libre: names.libre.length,
          tentativo: names.tentativo.length,
          ocupado: names.ocupado.length,
          sinDatos: names.sinDatos.length,
          names,
        });
      }
    }
    return map;
  }, [selectedConfiguredIds, byMemberSlot, membersById]);

  const bestSlots = useMemo(() => {
    const entries: { key: string; day: number; hour: number; libre: number }[] = [];
    for (let day = 0; day < 7; day++) {
      for (const hour of HOURS) {
        const key = slotKey(day, hour);
        const libre = slotStats.get(key)?.libre ?? 0;
        if (libre > 0) entries.push({ key, day, hour, libre });
      }
    }
    entries.sort((a, b) => b.libre - a.libre || a.day - b.day || a.hour - b.hour);
    return entries.slice(0, 3);
  }, [slotStats]);

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of filteredMembers) next.add(m.id);
      return next;
    });
  }

  function selectOnlyConfiguredFiltered() {
    setSelected(new Set(filteredMembers.filter((m) => m.hasSchedule).map((m) => m.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedMembers = useMemo(
    () => members.filter((m) => selected.has(m.id)),
    [members, selected],
  );

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="mb-1 text-xl font-semibold text-nexa-navy dark:text-white">
          Horarios del equipo
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Encuentra los mejores momentos para coordinar al equipo según la disponibilidad
          registrada.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Integrantes" value={members.length} />
        <MetricCard label="Con horario configurado" value={withScheduleCount} tone="positive" />
        <MetricCard label="Sin configurar" value={missingMembers.length} tone="warning" />
        <MetricCard label="Seleccionados" value={selected.size} tone="info" />
      </div>

      {missingMembers.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-300/60 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              ⚠ {missingMembers.length} integrante{missingMembers.length === 1 ? "" : "s"} aún no
              registr{missingMembers.length === 1 ? "ó" : "aron"} su disponibilidad.
            </p>
            <button
              type="button"
              onClick={() => setShowMissing((v) => !v)}
              className="shrink-0 rounded-md border border-amber-300/70 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
            >
              {showMissing ? "Ocultar" : "Ver integrantes"}
            </button>
          </div>
          {showMissing && (
            <ul className="flex flex-wrap gap-2 px-3 pb-3">
              {missingMembers.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/members/${m.id}#disponibilidad`}
                    className="flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  >
                    <InitialsAvatar name={m.full_name} size="sm" />
                    {m.full_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Filter / selection panel */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar integrante..."
            className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-nexa-blue dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Todos los proyectos</option>
            {projects.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-nexa-blue dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="todos">Todos los estados</option>
            <option value="con">Con horario</option>
            <option value="sin">Sin horario</option>
          </select>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 text-xs dark:border-slate-700">
          <button
            type="button"
            onClick={selectAllFiltered}
            className="rounded-full border border-slate-300 px-2.5 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            onClick={selectOnlyConfiguredFiltered}
            className="rounded-full border border-slate-300 px-2.5 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Solo con horario
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-full border border-slate-300 px-2.5 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Limpiar selección
          </button>
          <span className="ml-auto font-medium text-slate-500 dark:text-slate-400">
            {selected.size} integrante{selected.size === 1 ? "" : "s"} seleccionado
            {selected.size === 1 ? "" : "s"}
          </span>
        </div>

        {selectedMembers.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selectedMembers.slice(0, 10).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                title="Quitar de la selección"
                className="flex items-center gap-1 rounded-full border border-nexa-blue/30 bg-nexa-light py-0.5 pl-1 pr-2 text-xs font-medium text-nexa-navy transition-colors hover:bg-nexa-blue/20 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100"
              >
                <InitialsAvatar name={m.full_name} size="sm" />
                {m.full_name}
                <span aria-hidden className="text-nexa-blue/60">
                  ✕
                </span>
              </button>
            ))}
            {selectedMembers.length > 10 && (
              <span className="flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                +{selectedMembers.length - 10} más
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {filteredMembers.map((m) => {
            const isSelected = selected.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                  isSelected
                    ? "border-nexa-blue bg-nexa-light text-nexa-navy dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-100"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/40"
                }`}
              >
                <InitialsAvatar name={m.full_name} size="sm" />
                {m.full_name}
                {!m.hasSchedule && (
                  <span
                    title="Todavía no cargó su horario"
                    className="h-1.5 w-1.5 rounded-full bg-amber-400"
                  />
                )}
              </button>
            );
          })}
          {filteredMembers.length === 0 && (
            <p className="text-sm text-slate-400">Ningún integrante coincide con estos filtros.</p>
          )}
        </div>
      </div>

      {selected.size === 0 ? (
        <EmptyState
          title="No hay integrantes seleccionados"
          description="Selecciona integrantes para calcular su disponibilidad."
          action={
            <button
              type="button"
              onClick={() => setSelected(new Set(members.filter((m) => m.hasSchedule).map((m) => m.id)))}
              className="rounded-md bg-nexa-blue px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy"
            >
              Seleccionar todos con horario
            </button>
          }
        />
      ) : selectedConfiguredIds.length === 0 ? (
        <EmptyState
          title="El equipo seleccionado todavía no ha registrado disponibilidad."
          description="Ninguno de los integrantes seleccionados cargó su horario todavía."
        />
      ) : (
        <>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            {selectedConfiguredIds.length} de {selected.size} seleccionados tienen horario
            configurado
            {selected.size - selectedConfiguredIds.length > 0 && (
              <> · {selected.size - selectedConfiguredIds.length} sin configurar (no se cuentan)</>
            )}
            .
          </p>

          {bestSlots.length > 0 && (
            <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-3 text-sm font-semibold text-nexa-navy dark:text-white">
                Mejores horarios para coordinar
              </h2>
              <ul className="flex flex-wrap gap-4">
                {bestSlots.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-2 text-sm">
                    <span aria-hidden className="text-lg">
                      {MEDALS[i]}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {DAY_LABELS[s.day]} {String(s.hour).padStart(2, "0")}:00
                    </span>
                    <span className="text-slate-400">— {s.libre} disponibles</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Legend />

          {/* Desktop matrix */}
          <div className="hidden md:block">
            <DesktopMatrix
              slotStats={slotStats}
              configuredCount={selectedConfiguredIds.length}
              todayIdx={todayIdx}
              openCell={openCell}
              onCellClick={(key) => setOpenCell((prev) => (prev === key ? null : key))}
            />
          </div>

          {/* Mobile: one day at a time */}
          <div className="md:hidden">
            <MobileDayView
              day={mobileDay}
              onDayChange={setMobileDay}
              slotStats={slotStats}
              configuredCount={selectedConfiguredIds.length}
              todayIdx={todayIdx}
              openCell={openCell}
              onCellClick={(key) => setOpenCell((prev) => (prev === key ? null : key))}
            />
          </div>

          {openCell && (
            <CellDetail
              cellKey={openCell}
              stat={slotStats.get(openCell)!}
              onClose={() => setOpenCell(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "positive" | "warning" | "info";
}) {
  const TONE_STYLES = {
    neutral: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800",
    positive:
      "border-emerald-100 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30",
    warning: "border-amber-100 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30",
    info: "border-nexa-blue/20 bg-nexa-light dark:border-blue-900/40 dark:bg-blue-950/20",
  } as const;
  const VALUE_STYLES = {
    neutral: "text-nexa-navy dark:text-white",
    positive: "text-emerald-700 dark:text-emerald-300",
    warning: "text-amber-700 dark:text-amber-300",
    info: "text-nexa-blue dark:text-blue-300",
  } as const;
  return (
    <div className={`rounded-lg border p-3.5 ${TONE_STYLES[tone]}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${VALUE_STYLES[tone]}`}>{value}</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
      <span className="font-medium text-slate-500 dark:text-slate-400">Leyenda:</span>
      <LegendDot className="bg-emerald-400 dark:bg-emerald-500" label="Alta disponibilidad" />
      <LegendDot className="bg-amber-300 dark:bg-amber-600" label="Disponibilidad parcial" />
      <LegendDot className="bg-red-300 dark:bg-red-800" label="Sin disponibilidad" />
      <LegendDot className="bg-slate-200 dark:bg-slate-700" label="Sin datos" />
      <span className="text-slate-400">
        Cada celda: libres / integrantes seleccionados con horario configurado.
      </span>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${className}`} /> {label}
    </span>
  );
}

function cellTitle(dayLabel: string, hour: number, stat: SlotStat) {
  return `${dayLabel} ${String(hour).padStart(2, "0")}:00\n${stat.libre} disponibles\n${stat.tentativo} probablemente ocupados\n${stat.ocupado} ocupados\n${stat.sinDatos} sin datos`;
}

function DesktopMatrix({
  slotStats,
  configuredCount,
  todayIdx,
  openCell,
  onCellClick,
}: {
  slotStats: Map<string, SlotStat>;
  configuredCount: number;
  todayIdx: number | null;
  openCell: string | null;
  onCellClick: (key: string) => void;
}) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40">
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-xs">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="sticky left-0 z-20 w-16 bg-slate-50 dark:bg-slate-950/40"></th>
            {DAY_LABELS.map((d, i) => (
              <th key={d} className="bg-slate-50 pb-2 pt-2 text-center dark:bg-slate-950/40">
                <div
                  className={`mx-auto flex w-16 flex-col items-center rounded-lg px-1 py-1 ${
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
                className={`sticky left-0 z-10 w-16 bg-slate-50 pr-2 text-right align-top text-[11px] font-medium text-amber-600 dark:bg-slate-950/40 dark:text-amber-400 ${
                  rowIdx === 0 ? "" : "border-t border-dashed border-slate-300 dark:border-slate-700"
                }`}
              >
                {String(h).padStart(2, "0")}:00
              </td>
              {DAY_LABELS.map((dayLabel, dayIdx) => {
                const key = slotKey(dayIdx, h);
                const stat = slotStats.get(key)!;
                const ratio = configuredCount > 0 ? stat.libre / configuredCount : null;
                const isOpen = openCell === key;
                return (
                  <td
                    key={key}
                    className={`h-10 w-16 border-l border-slate-200 text-center dark:border-slate-700 ${
                      rowIdx === 0 ? "" : "border-t border-dashed border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <button
                      type="button"
                      title={cellTitle(dayLabel, h, stat)}
                      onClick={() => onCellClick(key)}
                      className={`m-0.5 flex h-[calc(100%-4px)] w-[calc(100%-4px)] flex-col items-center justify-center rounded-md font-medium text-nexa-navy transition-transform hover:scale-[1.04] dark:text-white ${cellClass(ratio)} ${isOpen ? "ring-2 ring-nexa-blue" : ""}`}
                    >
                      <span>{stat.libre}/{configuredCount}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileDayView({
  day,
  onDayChange,
  slotStats,
  configuredCount,
  todayIdx,
  openCell,
  onCellClick,
}: {
  day: number;
  onDayChange: (d: number) => void;
  slotStats: Map<string, SlotStat>;
  configuredCount: number;
  todayIdx: number | null;
  openCell: string | null;
  onCellClick: (key: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-1 overflow-x-auto pb-1">
        {DAY_LABELS.map((d, i) => (
          <button
            key={d}
            type="button"
            onClick={() => onDayChange(i)}
            className={`min-h-[40px] min-w-[44px] shrink-0 rounded-md px-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              day === i
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
      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
        {HOURS.map((h) => {
          const key = slotKey(day, h);
          const stat = slotStats.get(key)!;
          const ratio = configuredCount > 0 ? stat.libre / configuredCount : null;
          const isOpen = openCell === key;
          return (
            <button
              key={h}
              type="button"
              onClick={() => onCellClick(key)}
              className={`flex min-h-[44px] w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${isOpen ? "bg-nexa-light/60 dark:bg-blue-950/30" : ""}`}
            >
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {String(h).padStart(2, "0")}:00
              </span>
              <span
                className={`rounded-md px-2.5 py-1 text-xs font-semibold text-nexa-navy dark:text-white ${cellClass(ratio)}`}
              >
                {stat.libre}/{configuredCount} libres
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CellDetail({
  cellKey,
  stat,
  onClose,
}: {
  cellKey: string;
  stat: SlotStat;
  onClose: () => void;
}) {
  const [dayStr, hourStr] = cellKey.split("-");
  const day = Number(dayStr);
  const hour = Number(hourStr);

  const GROUPS: { category: CellCategory; label: string; dot: string }[] = [
    { category: "libre", label: AVAILABILITY_LABELS.libre, dot: "bg-emerald-400" },
    { category: "tentativo", label: AVAILABILITY_LABELS.tentativo, dot: "bg-amber-300" },
    { category: "ocupado", label: AVAILABILITY_LABELS.ocupado, dot: "bg-red-400" },
    { category: "sinDatos", label: "Sin datos", dot: "bg-slate-300" },
  ];

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-nexa-navy dark:text-white">
          {DAY_LABELS[day]} {String(hour).padStart(2, "0")}:00
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-nexa-blue hover:underline"
        >
          Cerrar detalle
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GROUPS.filter((g) => stat.names[g.category].length > 0).map((g) => (
          <div key={g.category}>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className={`h-2 w-2 rounded-full ${g.dot}`} /> {g.label} (
              {stat.names[g.category].length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stat.names[g.category].map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
