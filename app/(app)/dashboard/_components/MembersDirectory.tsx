"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { MEMBER_STATUSES, type MemberStatus } from "@/lib/types";
import {
  EMPTY_FILTERS,
  FILTERS_STORAGE_KEY,
  areaOptions,
  filterMembers,
  parseStoredFilters,
  positionOptions,
  sortMembers,
  type DirectoryMember,
  type DirectoryProject,
  type MemberFilters,
  type SortKey,
} from "@/lib/member-filters";
import SummaryCards from "./SummaryCards";
import FilterBar from "./FilterBar";
import ActiveFilters, { hasActiveFilters } from "./ActiveFilters";
import MembersTable from "./MembersTable";
import { SearchIcon } from "./icons";
import GenerateLetterDialog from "@/components/GenerateLetterDialog";

const SEARCH_DEBOUNCE_MS = 300;

function readStorage() {
  try {
    return parseStoredFilters(window.sessionStorage.getItem(FILTERS_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStorage(filters: MemberFilters) {
  try {
    const isDefault = (Object.keys(EMPTY_FILTERS) as (keyof MemberFilters)[]).every(
      (k) => filters[k] === EMPTY_FILTERS[k],
    );
    if (isDefault) window.sessionStorage.removeItem(FILTERS_STORAGE_KEY);
    else window.sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // sessionStorage bloqueado (modo privado estricto): los filtros siguen
    // funcionando, solo que no se recuerdan.
  }
}

// Filtros iniciales: los de la sesión, o los de un link viejo tipo
// /dashboard?status=activo&q=ana (que tienen prioridad y luego se limpian de la URL).
function initialFilters(): MemberFilters {
  const stored = readStorage() ?? EMPTY_FILTERS;
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  const status = params.get("status");
  if (q === null && status === null) return stored;

  params.delete("q");
  params.delete("status");
  const qs = params.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  return {
    ...EMPTY_FILTERS,
    q: q ?? "",
    status: MEMBER_STATUSES.includes(status as MemberStatus) ? (status as MemberStatus) : "",
  };
}

// Todo el filtrado es local: los integrantes ya llegan cargados desde el
// servidor (son pocos), así que cambiar un filtro no hace ninguna llamada.
export default function MembersDirectory({
  members,
  projects,
  notice,
}: {
  members: DirectoryMember[];
  projects: DirectoryProject[];
  notice?: React.ReactNode;
}) {
  const [filters, setFilters] = useState<MemberFilters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [restored, setRestored] = useState(false);
  // Un solo modal de carta para toda la tabla (el menú ⋮ solo pasa el id).
  const [letterMemberId, setLetterMemberId] = useState<string | null>(null);

  // sessionStorage solo existe en el navegador: se lee tras montar para no
  // desincronizar el HTML del servidor (layout effect: antes de pintar, sin parpadeo).
  useLayoutEffect(() => {
    const initial = initialFilters();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con sessionStorage (sistema externo) una sola vez
    setFilters(initial);
    setSearchInput(initial.q);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) writeStorage(filters);
  }, [filters, restored]);

  // Búsqueda mientras se escribe, con debounce.
  useEffect(() => {
    if (!restored) return;
    const id = window.setTimeout(() => {
      setFilters((f) => (f.q === searchInput ? f : { ...f, q: searchInput }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput, restored]);

  const update = (patch: Partial<MemberFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    if ("q" in patch) setSearchInput(patch.q ?? "");
  };

  const clearAll = () => {
    // Conserva el orden elegido; "Limpiar" es para los filtros.
    setFilters((f) => ({ ...EMPTY_FILTERS, sort: f.sort, dir: f.dir }));
    setSearchInput("");
  };

  const onSort = (column: SortKey) => {
    setFilters((f) =>
      f.sort !== column
        ? { ...f, sort: column, dir: "asc" }
        : f.dir === "asc"
          ? { ...f, dir: "desc" }
          : { ...f, sort: "", dir: "asc" },
    );
  };

  const counts = useMemo(() => {
    const c: Record<MemberStatus | "", number> = { "": members.length, activo: 0, pausado: 0, retirado: 0 };
    for (const m of members) c[m.status] += 1;
    return c;
  }, [members]);
  const areas = useMemo(() => areaOptions(members), [members]);
  const positions = useMemo(() => positionOptions(members), [members]);
  const visible = useMemo(
    () => sortMembers(filterMembers(members, filters), filters.sort, filters.dir),
    [members, filters],
  );
  const active = hasActiveFilters(filters) || searchInput.trim() !== "";

  return (
    <div className="space-y-5">
      <SummaryCards counts={counts} status={filters.status} onSelect={(status) => update({ status })} />

      {notice}

      <section
        aria-label="Filtros"
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(10,31,68,0.04)] dark:border-slate-700 dark:bg-slate-800"
      >
        <FilterBar
          filters={filters}
          searchInput={searchInput}
          onSearchInput={setSearchInput}
          onChange={update}
          onClear={clearAll}
          hasActive={active}
          areas={areas}
          positions={positions}
          projects={projects}
        />
        <ActiveFilters
          filters={filters}
          projects={projects}
          shown={visible.length}
          total={members.length}
          onRemove={update}
          onClear={clearAll}
        />
      </section>

      {visible.length > 0 ? (
        <MembersTable
          members={visible}
          sort={filters.sort}
          dir={filters.dir}
          onSort={onSort}
          onGenerateLetter={setLetterMemberId}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/30">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <SearchIcon className="h-5 w-5" />
          </span>
          {members.length === 0 ? (
            <>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Todavía no hay integrantes</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Registra al primero con “Nuevo integrante”.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No encontramos integrantes</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                No hay integrantes que coincidan con los filtros seleccionados.
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-4 h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      )}

      <GenerateLetterDialog
        memberId={letterMemberId}
        open={letterMemberId !== null}
        onClose={() => setLetterMemberId(null)}
      />
    </div>
  );
}
