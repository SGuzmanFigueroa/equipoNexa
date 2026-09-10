import { createClient } from "@/lib/supabase/server";
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
  searchParams: Promise<{ members?: string | string[] }>;
}) {
  const { members: rawMembers } = await searchParams;
  const selectedIds = (
    Array.isArray(rawMembers) ? rawMembers : rawMembers ? [rawMembers] : []
  ).filter(Boolean);

  const supabase = await createClient();
  const { data: allMembers } = await supabase
    .from("team_members")
    .select("id, full_name")
    .order("full_name");

  let counts: Map<string, number> | null = null;
  let selectedNames: string[] = [];

  if (selectedIds.length > 0) {
    const [{ data: availability }, { data: selectedMembers }] = await Promise.all([
      supabase
        .from("team_member_availability")
        .select("member_id, day_of_week, hour")
        .in("member_id", selectedIds),
      supabase.from("team_members").select("full_name").in("id", selectedIds),
    ]);

    selectedNames = (selectedMembers ?? []).map((m) => m.full_name);
    counts = new Map();
    for (const a of availability ?? []) {
      const key = slotKey(a.day_of_week, a.hour);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-nexa-navy dark:text-white">Horarios</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Elige a quiénes quieres cruzar y te muestro en qué horas coinciden. Cada quien marca su
        disponibilidad desde su propia ficha de integrante.
      </p>

      <form
        action="/schedule"
        className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Selecciona integrantes
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {(allMembers as Pick<TeamMember, "id" | "full_name">[] | null)?.map((m) => (
            <label
              key={m.id}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <input
                type="checkbox"
                name="members"
                value={m.id}
                defaultChecked={selectedIds.includes(m.id)}
              />
              {m.full_name}
            </label>
          ))}
          {allMembers?.length === 0 && (
            <p className="text-sm text-slate-400">Todavía no hay integrantes registrados.</p>
          )}
        </div>
        <button
          type="submit"
          className="rounded-md bg-nexa-blue px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy"
        >
          Ver horario combinado
        </button>
      </form>

      {selectedIds.length === 0 ? (
        <p className="text-sm text-slate-400">
          Elige al menos una persona para ver su disponibilidad.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Cruzando: <span className="font-medium">{selectedNames.join(", ")}</span> (
            {selectedIds.length} persona{selectedIds.length === 1 ? "" : "s"})
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm dark:border-slate-700">
            <table className="w-full min-w-[640px] border-collapse text-xs">
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
                      const count = counts?.get(key) ?? 0;
                      const ratio = count / selectedIds.length;
                      return (
                        <td
                          key={key}
                          className={`h-7 w-14 border border-slate-200 text-center dark:border-slate-700 ${intensityClass(ratio)}`}
                        >
                          {count > 0 ? `${count}/${selectedIds.length}` : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Verde intenso = todos libres. Ámbar/rojo = solo parte del grupo. En blanco = nadie
            marcó ese horario como libre.
          </p>
        </>
      )}
    </div>
  );
}
