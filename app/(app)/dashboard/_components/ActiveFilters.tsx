import { STATUS_LABELS } from "@/lib/types";
import {
  DATE_PRESET_LABELS,
  EMPTY_FILTERS,
  formatDateDMY,
  type DirectoryProject,
  type MemberFilters,
} from "@/lib/member-filters";
import { XIcon } from "./icons";

type Chip = { key: string; label: string; clear: Partial<MemberFilters> };

function chipsFor(filters: MemberFilters, projects: DirectoryProject[]): Chip[] {
  const chips: Chip[] = [];
  if (filters.q.trim()) chips.push({ key: "q", label: `“${filters.q.trim()}”`, clear: { q: "" } });
  if (filters.status) chips.push({ key: "status", label: STATUS_LABELS[filters.status], clear: { status: "" } });
  if (filters.area) chips.push({ key: "area", label: filters.area, clear: { area: "" } });
  if (filters.position) chips.push({ key: "position", label: filters.position, clear: { position: "" } });
  if (filters.project) {
    const p = projects.find((x) => x.id === filters.project);
    chips.push({ key: "project", label: p ? p.code : "Proyecto", clear: { project: "" } });
  }
  if (filters.date) {
    let label: string = DATE_PRESET_LABELS[filters.date];
    if (filters.date === "custom") {
      const from = formatDateDMY(filters.from);
      const to = formatDateDMY(filters.to);
      label = from && to ? `${from} – ${to}` : from ? `Desde ${from}` : to ? `Hasta ${to}` : "Rango personalizado";
    }
    chips.push({ key: "date", label: `Ingreso: ${label}`, clear: { date: "", from: "", to: "" } });
  }
  return chips;
}

export function hasActiveFilters(filters: MemberFilters) {
  return (
    filters.q.trim() !== "" ||
    (Object.keys(EMPTY_FILTERS) as (keyof MemberFilters)[]).some(
      (k) => k !== "q" && k !== "sort" && k !== "dir" && filters[k] !== EMPTY_FILTERS[k],
    )
  );
}

// Chips de filtros aplicados (cada uno se quita por separado) + conteo.
export default function ActiveFilters({
  filters,
  projects,
  shown,
  total,
  onRemove,
  onClear,
}: {
  filters: MemberFilters;
  projects: DirectoryProject[];
  shown: number;
  total: number;
  onRemove: (patch: Partial<MemberFilters>) => void;
  onClear: () => void;
}) {
  const chips = chipsFor(filters, projects);

  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700/70">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {chips.length > 0 ? (
          <>
            <span className="mr-1 text-xs font-medium text-slate-500 dark:text-slate-400">Filtros activos:</span>
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-nexa-blue/20 bg-nexa-light/60 py-0.5 pl-2.5 pr-1 text-xs font-medium text-nexa-navy dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-100"
              >
                <span className="truncate">{chip.label}</span>
                <button
                  type="button"
                  onClick={() => onRemove(chip.clear)}
                  aria-label={`Quitar filtro ${chip.label}`}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-nexa-blue/70 hover:bg-nexa-blue/15 hover:text-nexa-blue dark:text-blue-300 dark:hover:bg-blue-800/60"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={onClear}
              className="ml-1 text-xs font-medium text-nexa-blue hover:underline dark:text-blue-300"
            >
              Limpiar todos
            </button>
          </>
        ) : (
          <span className="text-xs text-slate-400">Sin filtros aplicados</span>
        )}
      </div>
      <p className="shrink-0 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        Resultados: <span className="font-semibold text-slate-700 dark:text-slate-200">{shown}</span> de{" "}
        {total} integrantes
      </p>
    </div>
  );
}
