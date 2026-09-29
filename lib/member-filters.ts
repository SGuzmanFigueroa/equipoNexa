// Lógica pura del filtrado/orden de la página "Integrantes" (sin React),
// para poder reutilizarla y probarla aparte.
import type { MemberStatus } from "@/lib/types";

export interface DirectoryProject {
  id: string;
  name: string;
  code: string;
}

export interface DirectoryMember {
  id: string;
  full_name: string;
  // Lo que se muestra en la columna "Área": área en Nexa o, si falta, la carrera.
  area: string | null;
  position: string | null;
  join_date: string | null;
  status: MemberStatus;
  is_leader: boolean;
  projects: DirectoryProject[];
}

export type DatePreset = "" | "this_month" | "last_month" | "this_year" | "custom";
export type SortKey = "full_name" | "area" | "position" | "join_date";
export type SortDir = "asc" | "desc";

export interface MemberFilters {
  q: string;
  status: MemberStatus | "";
  area: string;
  position: string;
  project: string; // project id
  date: DatePreset;
  from: string; // YYYY-MM-DD (rango personalizado)
  to: string;
  sort: SortKey | "";
  dir: SortDir;
}

export const EMPTY_FILTERS: MemberFilters = {
  q: "",
  status: "",
  area: "",
  position: "",
  project: "",
  date: "",
  from: "",
  to: "",
  sort: "",
  dir: "asc",
};

export const DATE_PRESET_LABELS: Record<Exclude<DatePreset, "">, string> = {
  this_month: "Este mes",
  last_month: "Mes anterior",
  this_year: "Este año",
  custom: "Rango personalizado",
};

// Minúsculas y sin tildes: "Ingeniería" y "ingenieria" coinciden.
export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Fechas de calendario locales (YYYY-MM-DD), sin pasar por UTC.
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "2026-09-15" → "15/09/2026". Solo presentación, el valor guardado no cambia.
export function formatDateDMY(value: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function dateRangeFor(filters: Pick<MemberFilters, "date" | "from" | "to">, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (filters.date) {
    case "this_month":
      return { from: isoLocal(new Date(y, m, 1)), to: isoLocal(new Date(y, m + 1, 0)) };
    case "last_month":
      return { from: isoLocal(new Date(y, m - 1, 1)), to: isoLocal(new Date(y, m, 0)) };
    case "this_year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "custom":
      return { from: filters.from || null, to: filters.to || null };
    default:
      return null;
  }
}

function uniqueSorted(values: (string | null)[]) {
  return [...new Set(values.filter((v): v is string => !!v && v.trim() !== ""))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

export function areaOptions(members: DirectoryMember[]) {
  return uniqueSorted(members.map((m) => m.area));
}

export function positionOptions(members: DirectoryMember[]) {
  return uniqueSorted(members.map((m) => m.position));
}

export function filterMembers(members: DirectoryMember[], filters: MemberFilters, today = new Date()) {
  const terms = normalizeText(filters.q).split(/\s+/).filter(Boolean);
  const range = dateRangeFor(filters, today);

  return members.filter((m) => {
    if (filters.status && m.status !== filters.status) return false;
    if (filters.area && m.area !== filters.area) return false;
    if (filters.position && m.position !== filters.position) return false;
    if (filters.project && !m.projects.some((p) => p.id === filters.project)) return false;

    if (range && (range.from || range.to)) {
      // Sin fecha de ingreso no puede caer en ningún rango.
      if (!m.join_date) return false;
      if (range.from && m.join_date < range.from) return false;
      if (range.to && m.join_date > range.to) return false;
    }

    if (terms.length > 0) {
      const haystack = normalizeText(
        [m.full_name, m.area, m.position, ...m.projects.flatMap((p) => [p.code, p.name])]
          .filter(Boolean)
          .join(" "),
      );
      // Cada palabra debe aparecer: "jose qa" encuentra a José en QA.
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}

// Sin orden elegido se mantiene el de siempre: ingreso más reciente primero,
// luego nombre. Los vacíos siempre van al final.
export function sortMembers(members: DirectoryMember[], sort: SortKey | "", dir: SortDir) {
  const list = [...members];
  const byName = (a: DirectoryMember, b: DirectoryMember) =>
    a.full_name.localeCompare(b.full_name, "es", { sensitivity: "base" });

  if (!sort) {
    return list.sort((a, b) => {
      if (a.join_date !== b.join_date) {
        if (!a.join_date) return 1;
        if (!b.join_date) return -1;
        return a.join_date < b.join_date ? 1 : -1;
      }
      return byName(a, b);
    });
  }

  const factor = dir === "asc" ? 1 : -1;
  return list.sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (!av && !bv) return byName(a, b);
    if (!av) return 1;
    if (!bv) return -1;
    const cmp = av.localeCompare(bv, "es", { sensitivity: "base" });
    return cmp !== 0 ? cmp * factor : byName(a, b);
  });
}

// Filtros guardados solo durante la sesión del navegador (sessionStorage),
// nunca en la base de datos.
export const FILTERS_STORAGE_KEY = "equipo-nexa:integrantes:filtros";

export function parseStoredFilters(raw: string | null): MemberFilters | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<MemberFilters>;
    const merged = { ...EMPTY_FILTERS };
    for (const key of Object.keys(EMPTY_FILTERS) as (keyof MemberFilters)[]) {
      if (typeof data[key] === "string") (merged as Record<string, string>)[key] = data[key] as string;
    }
    return merged;
  } catch {
    return null;
  }
}
