import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { DAY_LABELS, HOURS, slotKey, type TeamMember } from "@/lib/types";

function intensityClass(ratio: number) {
  if (ratio === 0) return "bg-white dark:bg-slate-900";
  if (ratio === 1) return "bg-emerald-500 text-white dark:bg-emerald-500";
  if (ratio >= 0.6) return "bg-emerald-300 dark:bg-emerald-700/70 dark:text-white";
  if (ratio >= 0.3) return "bg-amber-200 dark:bg-amber-800/60 dark:text-white";
  return "bg-red-100 dark:bg-red-950/40 dark:text-red-200";
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ members?: string | string[]; filtered?: string }>;
}) {
  await requireAdmin();
  const { members: rawMembers, filtered } = await searchParams;
  const isFiltered = filtered === "1";
  const checkedIds = (
    Array.isArray(rawMembers) ? rawMembers : rawMembers ? [rawMembers] : []
  ).filter(Boolean);

  const supabase = await createClient();
  const { data: allMembers } = await supabase
    .from("team_members")
    .select("id, full_name")
    .order("full_name");

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

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-nexa-navy dark:text-white">Horarios</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Por defecto ves el horario general (todo el equipo). Desmarca a quienes no quieras incluir
        para ver un cruce filtrado.
      </p>

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
              <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Todos libres
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-emerald-300 dark:bg-emerald-700/70" /> La
              mayoría libre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-amber-200 dark:bg-amber-800/60" /> Parte del
              grupo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-red-100 dark:bg-red-950/40" /> Muy pocos
              libres
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />{" "}
              Nadie marcó libre esa hora
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="w-16"></th>
                  {DAY_LABELS.map((d, i) => (
                    <th key={d} className="pb-2 text-center">
                      <div
                        className={`mx-auto flex w-14 flex-col items-center rounded-lg px-1 py-1 ${
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
                      className={`w-16 pr-2 text-right align-top text-[11px] font-medium text-amber-600 dark:text-amber-400 ${
                        rowIdx === 0
                          ? ""
                          : "border-t border-dashed border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {String(h).padStart(2, "0")}:00
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
                            className={`m-0.5 flex h-[calc(100%-4px)] items-center justify-center rounded-md ${intensityClass(ratio)}`}
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
        </>
      )}
    </div>
  );
}
