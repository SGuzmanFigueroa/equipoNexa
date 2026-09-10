import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  DAY_LABELS,
  HOURS,
  slotKey,
  type TeamMember,
} from "@/lib/types";

// Mismo semáforo de 3 colores que la grilla individual (verde/amarillo/rojo)
// — nunca un cuarto color — pero con 3 tonos dentro de cada uno según qué
// tan cerca está del límite, para poder distinguir 1/20 de 9/20 sin dejar
// de ser "amarillo" ambos.
const TENTATIVO_SHADES = [
  "bg-amber-100 dark:bg-amber-950/30",
  "bg-amber-200 dark:bg-amber-800/50",
  "bg-amber-300 dark:bg-amber-700/60",
];
const LIBRE_SHADES = [
  "bg-emerald-200 dark:bg-emerald-800/50",
  "bg-emerald-400 dark:bg-emerald-600/70",
  "bg-emerald-500 dark:bg-emerald-500",
];

function groupStatusClass(ratio: number) {
  if (ratio === 0) return AVAILABILITY_COLORS.ocupado;
  if (ratio < 0.5) {
    const step = Math.min(2, Math.floor((ratio / 0.5) * 3));
    return TENTATIVO_SHADES[step];
  }
  const step = Math.min(2, Math.floor(((ratio - 0.5) / 0.5) * 3));
  return LIBRE_SHADES[step];
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    members?: string | string[];
    filtered?: string;
    day?: string;
    hour?: string;
    onlyFree?: string;
  }>;
}) {
  await requireAdmin();
  const { members: rawMembers, filtered, day, hour, onlyFree: onlyFreeParam } = await searchParams;
  const selectedDay = day !== undefined ? Number(day) : null;
  const selectedHour = hour !== undefined ? Number(hour) : null;
  const onlyFree = onlyFreeParam === "1";
  const isFiltered = filtered === "1";
  const checkedIds = (
    Array.isArray(rawMembers) ? rawMembers : rawMembers ? [rawMembers] : []
  ).filter(Boolean);

  const supabase = await createClient();
  const [{ data: allMembers }, { data: withAvailability }] = await Promise.all([
    supabase.from("team_members").select("id, full_name").order("full_name"),
    supabase.from("team_member_availability").select("member_id"),
  ]);

  const idsWithSchedule = new Set((withAvailability ?? []).map((a) => a.member_id));
  const missingSchedule = (allMembers ?? []).filter((m) => !idsWithSchedule.has(m.id));

  const todayIdx = (new Date().getDay() + 6) % 7; // 0=Lunes..6=Domingo

  const allIds = (allMembers ?? []).map((m) => m.id);
  // No filter submitted yet -> "horario general": everyone included by default.
  // Filter submitted -> "horario filtrado": exactly whoever is checked (can be a subset, or none).
  const selectedIds = isFiltered ? checkedIds : allIds;

  let counts: Map<string, number> | null = null;
  let selectedNames: string[] = [];

  if (selectedIds.length > 0) {
    const [{ data: availability }, { data: selectedMembers }] = await Promise.all([
      supabase
        .from("team_member_availability")
        .select("member_id, day_of_week, hour, status")
        .in("member_id", selectedIds),
      supabase.from("team_members").select("full_name").in("id", selectedIds),
    ]);

    selectedNames = (selectedMembers ?? []).map((m) => m.full_name);
    counts = new Map();
    for (const a of availability ?? []) {
      if (a.status !== "libre") continue; // "tentativo"/"ocupado" no cuentan como libres.
      const key = slotKey(a.day_of_week, a.hour);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  // Query string helper that keeps the current selection/filter when
  // linking to a day's detail (or clearing it).
  function scheduleHref(extra: Record<string, string | null>) {
    const params = new URLSearchParams();
    if (isFiltered) {
      params.set("filtered", "1");
      checkedIds.forEach((id) => params.append("members", id));
    }
    if (selectedDay !== null) params.set("day", String(selectedDay));
    if (selectedHour !== null) params.set("hour", String(selectedHour));
    if (onlyFree) params.set("onlyFree", "1");
    for (const [key, value] of Object.entries(extra)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/schedule?${qs}` : "/schedule";
  }

  type DetailEntry = { full_name: string; status: "libre" | "tentativo" | "ocupado" };
  // Detail panel works two ways: pick a day (rows = hours) or pick an hour
  // (rows = days) — whichever was clicked last wins, they're mutually
  // exclusive. `detailRows` unifies both into {label, key, entries} so the
  // panel below only needs one render path.
  let detailTitle: string | null = null;
  let detailRows: { key: number; label: string; entries: DetailEntry[] }[] | null = null;

  if (selectedDay !== null && selectedIds.length > 0) {
    const { data: rows } = await supabase
      .from("team_member_availability")
      .select("hour, status, member:team_members(full_name)")
      .eq("day_of_week", selectedDay)
      .in("member_id", selectedIds);

    const byHour = new Map<number, DetailEntry[]>();
    for (const row of rows ?? []) {
      const fullName = (row.member as unknown as { full_name: string } | null)?.full_name;
      if (!fullName) continue;
      const list = byHour.get(row.hour) ?? [];
      list.push({ full_name: fullName, status: row.status as DetailEntry["status"] });
      byHour.set(row.hour, list);
    }
    detailTitle = `Detalle del ${DAY_LABELS[selectedDay]}`;
    detailRows = HOURS.filter((h) => byHour.has(h)).map((h) => ({
      key: h,
      label: `${String(h).padStart(2, "0")}:00`,
      entries: byHour.get(h)!,
    }));
  } else if (selectedHour !== null && selectedIds.length > 0) {
    const { data: rows } = await supabase
      .from("team_member_availability")
      .select("day_of_week, status, member:team_members(full_name)")
      .eq("hour", selectedHour)
      .in("member_id", selectedIds);

    const byDay = new Map<number, DetailEntry[]>();
    for (const row of rows ?? []) {
      const fullName = (row.member as unknown as { full_name: string } | null)?.full_name;
      if (!fullName) continue;
      const list = byDay.get(row.day_of_week) ?? [];
      list.push({ full_name: fullName, status: row.status as DetailEntry["status"] });
      byDay.set(row.day_of_week, list);
    }
    detailTitle = `Detalle de las ${String(selectedHour).padStart(2, "0")}:00`;
    detailRows = DAY_LABELS.map((label, i) => ({ key: i, label, entries: byDay.get(i) ?? [] })).filter(
      (r) => r.entries.length > 0,
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-nexa-navy dark:text-white">Horarios</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Por defecto ves el horario general (todo el equipo). Desmarca a quienes no quieras incluir
        para ver un cruce filtrado.
      </p>

      {missingSchedule.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
            {missingSchedule.length} integrante{missingSchedule.length === 1 ? "" : "s"} todavía
            no {missingSchedule.length === 1 ? "cargó" : "cargaron"} su horario
          </p>
          <ul className="flex flex-wrap gap-2">
            {missingSchedule.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/members/${m.id}#disponibilidad`}
                  className="rounded-full border border-amber-400/60 bg-white px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                >
                  {m.full_name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        action="/schedule"
        className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <input type="hidden" name="filtered" value="1" />
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Integrantes incluidos
        </p>
        <div className="mb-3 flex flex-wrap gap-x-1 gap-y-2">
          {(allMembers as Pick<TeamMember, "id" | "full_name">[] | null)?.map((m) => (
            <span
              key={m.id}
              className="flex items-center gap-1 rounded-md border border-slate-300 bg-white pl-2.5 pr-1 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="members"
                  value={m.id}
                  defaultChecked={selectedIds.includes(m.id)}
                />
                {m.full_name}
                {!idsWithSchedule.has(m.id) && (
                  <span
                    title="Todavía no cargó su horario"
                    className="h-1.5 w-1.5 rounded-full bg-amber-400"
                  />
                )}
              </label>
              <Link
                href={`/members/${m.id}#disponibilidad`}
                title="Editar su horario"
                className="ml-1 text-xs text-nexa-blue hover:underline"
              >
                editar
              </Link>
            </span>
          ))}
          {allMembers?.length === 0 && (
            <p className="text-sm text-slate-400">
              Todavía no hay integrantes registrados. Ve a{" "}
              <Link href="/members/new" className="text-nexa-blue hover:underline">
                Nuevo integrante
              </Link>
              .
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded-md bg-nexa-blue px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy"
          >
            Ver horario filtrado
          </button>
          {isFiltered && (
            <Link
              href="/schedule"
              className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Volver al horario general
            </Link>
          )}
        </div>
      </form>

      {selectedIds.length === 0 ? (
        <p className="text-sm text-slate-400">
          Ningún integrante seleccionado — marca al menos uno arriba.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            {isFiltered ? "Cruzando" : "Horario general — todos"}:{" "}
            <span className="font-medium">{selectedNames.join(", ")}</span> ({selectedIds.length}{" "}
            persona{selectedIds.length === 1 ? "" : "s"})
          </p>

          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
            <span className="font-medium text-slate-500 dark:text-slate-400">Leyenda:</span>
            <span className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${AVAILABILITY_COLORS.libre.split(" ")[0]}`} />{" "}
              {AVAILABILITY_LABELS.libre} — la mitad o más del grupo libre
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-3 w-3 rounded-sm ${AVAILABILITY_COLORS.tentativo.split(" ")[0]}`}
              />{" "}
              {AVAILABILITY_LABELS.tentativo} — algunos libres, menos de la mitad
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-3 w-3 rounded-sm ${AVAILABILITY_COLORS.ocupado.split(" ")[0]}`}
              />{" "}
              {AVAILABILITY_LABELS.ocupado} — nadie del grupo marcó libre
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="w-16"></th>
                  {DAY_LABELS.map((d, i) => (
                    <th key={d} className="pb-2 text-center">
                      <Link
                        href={scheduleHref({
                          day: selectedDay === i ? null : String(i),
                          hour: null,
                        })}
                        title="Ver detalle del día con nombres"
                        className={`mx-auto flex w-14 flex-col items-center rounded-lg px-1 py-1 transition-colors ${
                          selectedDay === i
                            ? "bg-nexa-blue text-white"
                            : todayIdx === i
                              ? "bg-amber-400 text-nexa-navy hover:bg-amber-500 dark:bg-amber-500 dark:text-slate-900"
                              : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="text-[11px] font-medium uppercase tracking-wide">
                          {d.slice(0, 3)}
                        </span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((h, rowIdx) => (
                  <tr key={h}>
                    <td
                      className={`w-16 pr-2 text-right align-top text-[11px] ${
                        rowIdx === 0
                          ? ""
                          : "border-t border-dashed border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      <Link
                        href={scheduleHref({
                          hour: selectedHour === h ? null : String(h),
                          day: null,
                        })}
                        title="Ver detalle de esta hora con nombres"
                        className={`inline-block rounded px-1 font-medium transition-colors ${
                          selectedHour === h
                            ? "bg-nexa-blue text-white"
                            : "text-amber-600 hover:bg-slate-200 dark:text-amber-400 dark:hover:bg-slate-800"
                        }`}
                      >
                        {String(h).padStart(2, "0")}:00
                      </Link>
                    </td>
                    {DAY_LABELS.map((_, dayIdx) => {
                      const key = slotKey(dayIdx, h);
                      const count = counts?.get(key) ?? 0;
                      const ratio = count / selectedIds.length;
                      return (
                        <td
                          key={key}
                          className={`h-8 w-14 border-l border-slate-200 text-center dark:border-slate-700 ${
                            rowIdx === 0
                              ? ""
                              : "border-t border-dashed border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          <div
                            className={`m-0.5 flex h-[calc(100%-4px)] items-center justify-center rounded-md font-medium text-nexa-navy dark:text-white ${groupStatusClass(ratio)}`}
                          >
                            {count > 0 ? `${count}/${selectedIds.length}` : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Solo cuenta lo que cada quien marcó como &quot;Libre&quot; en su propia grilla —
            &quot;Probablemente ocupado&quot; y &quot;Ocupado&quot; no suman aquí.
          </p>

          {detailTitle && detailRows && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-nexa-navy dark:text-white">
                  {detailTitle}
                </h2>
                <div className="flex items-center gap-3">
                  <Link
                    href={scheduleHref({ onlyFree: onlyFree ? null : "1" })}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      onlyFree
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {onlyFree ? "✓ " : ""}Solo libres
                  </Link>
                  <Link
                    href={scheduleHref({ day: null, hour: null })}
                    className="text-xs text-nexa-blue hover:underline"
                  >
                    Cerrar detalle
                  </Link>
                </div>
              </div>

              {detailRows.length === 0 ||
              detailRows.every((r) => onlyFree && r.entries.every((e) => e.status !== "libre")) ? (
                <p className="text-sm text-slate-400">
                  {onlyFree
                    ? "Nadie del grupo marcó libre aquí."
                    : "Nadie del grupo marcó nada aquí todavía."}
                </p>
              ) : (
                <div className="space-y-2">
                  {detailRows.map(({ key, label, entries }) => {
                    const visible = onlyFree
                      ? entries.filter((e) => e.status === "libre")
                      : entries;
                    if (visible.length === 0) return null;
                    return (
                      <div
                        key={key}
                        className="flex flex-col gap-1 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-700 sm:flex-row sm:items-start sm:gap-3"
                      >
                        <span className="w-16 shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">
                          {label}
                        </span>
                        <div className="flex flex-1 flex-wrap gap-1.5">
                          {(["libre", "tentativo", "ocupado"] as const).map((status) =>
                            visible
                              .filter((e) => e.status === status)
                              .map((e) => (
                                <span
                                  key={`${status}-${e.full_name}`}
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium text-nexa-navy dark:text-white ${AVAILABILITY_COLORS[status].split(" ")[0]}`}
                                  title={AVAILABILITY_LABELS[status]}
                                >
                                  {e.full_name}
                                </span>
                              )),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
