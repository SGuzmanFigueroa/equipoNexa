import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateMember, deleteMember, addTrackingEntry } from "./actions";
import { MEMBER_STATUSES, STATUS_LABELS, type TeamMember, type TrackingEntry } from "@/lib/types";

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: member }, { data: tracking }] = await Promise.all([
    supabase.from("team_members").select("*").eq("id", id).single(),
    supabase
      .from("team_member_tracking")
      .select("*, author:profiles(id, full_name, email)")
      .eq("member_id", id)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!member) notFound();

  const m = member as TeamMember;
  const updateWithId = updateMember.bind(null, id);
  const deleteWithId = deleteMember.bind(null, id);
  const addTrackingWithId = addTrackingEntry.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-nexa-navy dark:text-white">{m.full_name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {m.position ?? "Sin cargo"} · {m.area ?? "Sin área"}
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-sm font-semibold text-nexa-navy dark:text-white">
          Datos del integrante
        </h2>
        <form action={updateWithId} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre completo</label>
            <input
              name="full_name"
              defaultValue={m.full_name}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Correo</label>
              <input
                name="email"
                type="email"
                defaultValue={m.email ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Teléfono</label>
              <input
                name="phone"
                defaultValue={m.phone ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Área</label>
              <input
                name="area"
                defaultValue={m.area ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Cargo</label>
              <input
                name="position"
                defaultValue={m.position ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tipo de colaboración
              </label>
              <input
                name="collaboration_type"
                defaultValue={m.collaboration_type ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
              <select
                name="status"
                defaultValue={m.status}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                {MEMBER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Fecha de ingreso
              </label>
              <input
                name="join_date"
                type="date"
                defaultValue={m.join_date}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Fecha de salida
              </label>
              <input
                name="end_date"
                type="date"
                defaultValue={m.end_date ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notas</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={m.notes ?? ""}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              className="rounded-md bg-nexa-blue px-4 py-2 text-sm font-medium text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy"
            >
              Guardar cambios
            </button>
          </div>
        </form>

        <form action={deleteWithId} className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
          <button
            type="submit"
            className="text-sm text-red-600 hover:underline dark:text-red-400"
          >
            Eliminar integrante
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-sm font-semibold text-nexa-navy dark:text-white">Seguimiento</h2>

        <form action={addTrackingWithId} className="mb-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
            <input
              name="entry_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <input
              name="note"
              required
              placeholder="Ej: Reunión 1:1, avance de módulo, feedback..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-nexa-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
          >
            + Agregar nota de seguimiento
          </button>
        </form>

        <ul className="space-y-3">
          {(tracking as TrackingEntry[] | null)?.map((t) => (
            <li
              key={t.id}
              className="rounded-md border border-slate-100 bg-nexa-light/30 p-3 dark:border-slate-700 dark:bg-slate-700/30"
            >
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-nexa-navy dark:text-blue-300">
                  {t.entry_date}
                </span>
                <span>{t.author?.full_name ?? t.author?.email ?? ""}</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">{t.note}</p>
            </li>
          ))}
          {tracking?.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              Todavía no hay notas de seguimiento para este integrante.
            </p>
          )}
        </ul>
      </section>
    </div>
  );
}
