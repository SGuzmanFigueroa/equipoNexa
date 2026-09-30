"use client";

import { useMemo } from "react";
import { DAY_LABELS, type AvailabilityStatus } from "@/lib/types";
import { bestRangesFor, formatRange, notConfirmedIn, type NotConfirmed } from "@/lib/schedule-best";
import type { ScheduleMember } from "./ScheduleView";

const REASON_LABEL: Record<NotConfirmed["reason"], string> = {
  tentativo: "tal vez",
  ocupado: "no disponible",
  sinMarcar: "sin marcar",
  sinHorario: "sin horario",
};

function firstNames(name: string) {
  return name.split(/\s+/).slice(0, 2).join(" ");
}

// Tarjetas "Mejores momentos por proyecto": una por proyecto con gente
// asignada (activos). Proyectos sin integrantes no se muestran.
export default function ProjectBestSlots({
  members,
  projects,
  byMemberSlot,
  onFocusProject,
}: {
  members: ScheduleMember[];
  projects: { code: string; name: string }[];
  byMemberSlot: Map<string, Map<string, AvailabilityStatus>>;
  onFocusProject: (memberIds: string[]) => void;
}) {
  const cards = useMemo(
    () =>
      projects
        .map((p) => {
          const team = members.filter((m) => m.status === "activo" && m.projectCodes.includes(p.code));
          const withSchedule = team.filter((m) => m.hasSchedule);
          const ranges = bestRangesFor(
            withSchedule.map((m) => m.id),
            byMemberSlot,
          );
          const missing = ranges[0]
            ? notConfirmedIn(
                ranges[0],
                team.map((m) => ({ id: m.id, name: m.full_name, hasSchedule: m.hasSchedule })),
                byMemberSlot,
              )
            : [];
          return { project: p, team, withSchedule, ranges, missing };
        })
        .filter((c) => c.team.length > 0)
        .sort((a, b) => a.project.code.localeCompare(b.project.code)),
    [members, projects, byMemberSlot],
  );

  if (cards.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-nexa-navy dark:text-white">Mejores momentos por proyecto</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Se calcula solo con los integrantes activos asignados a cada proyecto y sus horarios.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cards.map(({ project, team, withSchedule, ranges, missing }) => (
          <article
            key={project.code}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <header className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2">
                  <span className="rounded-md bg-nexa-light/70 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-nexa-blue ring-1 ring-inset ring-nexa-blue/15 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800/50">
                    {project.code}
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{project.name}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {team.length} integrante{team.length === 1 ? "" : "s"} · {withSchedule.length} con horario
                </p>
              </div>
              <button
                type="button"
                onClick={() => onFocusProject(team.map((m) => m.id))}
                className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/40"
              >
                Ver detalle
              </button>
            </header>

            {ranges.length === 0 ? (
              <p className="text-sm text-slate-400">
                {withSchedule.length === 0
                  ? "Nadie de este proyecto registró su horario todavía."
                  : "No hay franjas donde alguien esté disponible."}
              </p>
            ) : (
              <ol className="space-y-1.5">
                {ranges.map((r, i) => (
                  <li
                    key={`${r.day}-${r.startHour}`}
                    className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm ${
                      i === 0
                        ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900/50"
                        : "bg-slate-50 dark:bg-slate-900/40"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{DAY_LABELS[r.day]}</span>{" "}
                      <span className="whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300">{formatRange(r)}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-xs">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {r.libre} de {team.length}
                      </span>
                      {r.tentativo > 0 && <span className="text-amber-600 dark:text-amber-400"> +{r.tentativo} tal vez</span>}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {ranges.length > 0 && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {missing.length === 0 ? (
                  <span className="text-emerald-700 dark:text-emerald-400">En el mejor momento está todo el equipo.</span>
                ) : (
                  <>
                    <span className="font-medium text-slate-600 dark:text-slate-300">Faltan en el mejor momento: </span>
                    {missing.map((m) => `${firstNames(m.name)} (${REASON_LABEL[m.reason]})`).join(", ")}
                  </>
                )}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
