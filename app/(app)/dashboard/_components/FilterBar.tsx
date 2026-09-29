import { MEMBER_STATUSES, STATUS_LABELS } from "@/lib/types";
import {
  DATE_PRESET_LABELS,
  type DatePreset,
  type DirectoryProject,
  type MemberFilters,
} from "@/lib/member-filters";
import { SearchIcon, XIcon } from "./icons";

const CONTROL =
  "h-10 w-full rounded-lg border px-3 text-sm text-slate-700 outline-none transition-colors focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/15 dark:text-slate-100 dark:[color-scheme:dark]";
const IDLE = "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";
const SET = "border-nexa-blue/50 bg-nexa-light/40 dark:border-blue-600/60 dark:bg-blue-950/50";

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL} ${value ? SET : IDLE} truncate pr-8`}
      >
        {children}
      </select>
    </label>
  );
}

// Zona de filtros: todo se aplica al cambiar, sin botón "Filtrar".
export default function FilterBar({
  filters,
  searchInput,
  onSearchInput,
  onChange,
  onClear,
  hasActive,
  areas,
  positions,
  projects,
}: {
  filters: MemberFilters;
  searchInput: string;
  onSearchInput: (value: string) => void;
  onChange: (patch: Partial<MemberFilters>) => void;
  onClear: () => void;
  hasActive: boolean;
  areas: string[];
  positions: string[];
  projects: DirectoryProject[];
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchInput(e.target.value)}
          placeholder="Buscar integrante por nombre, área, cargo o proyecto..."
          aria-label="Buscar integrante"
          className={`${CONTROL} ${IDLE} pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden`}
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => onSearchInput("")}
            aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <FilterSelect
          label="Estado"
          value={filters.status}
          onChange={(v) => onChange({ status: v as MemberFilters["status"] })}
        >
          <option value="">Todos los estados</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Área" value={filters.area} onChange={(v) => onChange({ area: v })}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Cargo" value={filters.position} onChange={(v) => onChange({ position: v })}>
          <option value="">Todos los cargos</option>
          {positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Proyecto" value={filters.project} onChange={(v) => onChange({ project: v })}>
          <option value="">Todos los proyectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Fecha de ingreso"
          value={filters.date}
          onChange={(v) => onChange({ date: v as DatePreset, ...(v === "custom" ? {} : { from: "", to: "" }) })}
        >
          <option value="">Todas las fechas</option>
          {Object.entries(DATE_PRESET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterSelect>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasActive}
          className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Limpiar filtros
        </button>
      </div>

      {filters.date === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>Ingreso</span>
          <label className="flex items-center gap-2">
            desde
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => onChange({ from: e.target.value })}
              className={`${CONTROL} ${filters.from ? SET : IDLE} w-auto`}
            />
          </label>
          <label className="flex items-center gap-2">
            hasta
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => onChange({ to: e.target.value })}
              className={`${CONTROL} ${filters.to ? SET : IDLE} w-auto`}
            />
          </label>
        </div>
      )}
    </div>
  );
}
