import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLeader } from "@/lib/auth";
import SubmitButton from "@/components/SubmitButton";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SuccessBanner from "@/components/SuccessBanner";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import { updateMember, deleteMember, addTrackingEntry, saveAvailability } from "./actions";
import {
  CAREER_OPTIONS,
  MEMBER_STATUSES,
  ROLE_OPTIONS,
  STATUS_LABELS,
  encodeSlot,
  type TeamMember,
  type TrackingEntry,
  type Project,
  type Profile,
  type AvailabilityStatus,
} from "@/lib/types";

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { isAdmin } = await requireAdminOrLeader();
  const { id } = await params;
  const { error, success } = await searchParams;
  const supabase = await createClient();

  const [
    { data: member },
    { data: tracking },
    { data: projects },
    { data: memberProjects },
    { data: availability },
    { data: allProfiles },
  ] = await Promise.all([
    supabase.from("team_members").select("*").eq("id", id).single(),
    supabase
      .from("team_member_tracking")
      .select("*, author:profiles(id, full_name, email)")
      .eq("member_id", id)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name, code").order("name"),
    supabase.from("team_member_projects").select("project_id").eq("member_id", id),
    supabase.from("team_member_availability").select("day_of_week, hour, status").eq("member_id", id),
    supabase.from("profiles").select("id, email, full_name").order("email"),
  ]);

  if (!member) notFound();

  const m = member as TeamMember;
  const selectedProjectIds = new Set((memberProjects ?? []).map((mp) => mp.project_id));
  const initialSlots = (availability ?? []).map((a) =>
    encodeSlot(a.day_of_week, a.hour, a.status as AvailabilityStatus),
  );
  const updateWithId = updateMember.bind(null, id);
  const deleteWithId = deleteMember.bind(null, id);
  const addTrackingWithId = addTrackingEntry.bind(null, id);
  const saveAvailabilityWithId = saveAvailability.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-nexa-navy dark:text-white">{m.full_name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {m.position ?? "Sin cargo"} · {m.area ?? "Sin área"}
        </p>
      </div>

      {success && <SuccessBanner message={success} />}
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
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nombre completo{" "}
              {!isAdmin && <span className="text-xs text-slate-400">(solo un admin lo cambia)</span>}
            </label>
            <input
              name="full_name"
              defaultValue={m.full_name}
              required
              disabled={!isAdmin}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Correo{" "}
                {!isAdmin && (
                  <span className="text-xs text-slate-400">(solo un admin lo cambia)</span>
                )}
              </label>
              <input
                name="email"
                type="email"
                defaultValue={m.email ?? ""}
                disabled={!isAdmin}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-500"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Edad
              </label>
              <input
                name="age"
                type="number"
                min={0}
                defaultValue={m.age ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Carrera
              </label>
              <select
                name="career"
                defaultValue={m.career ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Sin especificar</option>
                {CAREER_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {m.career && !CAREER_OPTIONS.includes(m.career) && (
                  <option value={m.career}>{m.career}</option>
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Rol de último trabajo
              </label>
              <input
                name="last_job_role"
                defaultValue={m.last_job_role ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                LinkedIn
              </label>
              <input
                name="linkedin_url"
                type="url"
                defaultValue={m.linkedin_url ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                GitHub (usuario)
              </label>
              <input
                name="github_username"
                defaultValue={m.github_username ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Skills
              </label>
              <input
                name="skills"
                defaultValue={m.skills ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Área favorita (de su carrera)
              </label>
              <input
                name="favorite_area"
                defaultValue={m.favorite_area ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Proyectos asignados
              </label>
              <Link href="/projects" className="text-xs text-nexa-blue hover:underline">
                + Agregar proyecto nuevo
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {(projects as Pick<Project, "id" | "name" | "code">[] | null)?.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  <input
                    type="checkbox"
                    name="project_ids"
                    value={p.id}
                    defaultChecked={selectedProjectIds.has(p.id)}
                  />
                  {p.name}
                </label>
              ))}
              {projects?.length === 0 && (
                <p className="text-sm text-slate-400">
                  Todavía no hay proyectos —{" "}
                  <Link href="/projects" className="text-nexa-blue hover:underline">
                    crea el primero
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 dark:border-slate-700 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Área en Nexa</label>
              <input
                name="area"
                defaultValue={m.area ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Cargo en Nexa</label>
              <select
                name="position"
                defaultValue={m.position ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Sin especificar</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {m.position && !ROLE_OPTIONS.includes(m.position) && (
                  <option value={m.position}>{m.position}</option>
                )}
              </select>
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Cuenta vinculada (login){" "}
              {!isAdmin && <span className="text-xs text-slate-400">(solo un admin la cambia)</span>}
            </label>
            <select
              name="profile_id"
              defaultValue={m.profile_id ?? ""}
              disabled={!isAdmin}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-500"
            >
              <option value="">Sin vincular</option>
              {(allProfiles as Pick<Profile, "id" | "email" | "full_name">[] | null)?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email} ({p.email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              La cuenta que quede vinculada aquí puede entrar a Equipo Nexa y ver su estado y
              subir su propio horario en <code>/me</code> — todo lo demás de esta ficha sigue
              siendo solo tuyo para editar.
            </p>
          </div>

          {isAdmin && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
              <label className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                <input type="checkbox" name="is_leader" defaultChecked={m.is_leader} />
                Es líder
              </label>
              <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/70">
                Un líder puede crear/editar integrantes casi como un admin, pero no puede cambiar
                nombre, correo, fecha de ingreso ni la cuenta vinculada de nadie, ni eliminar
                integrantes ni nombrar a otros líderes — eso queda solo para ti.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Fecha de ingreso{" "}
                {!isAdmin && <span className="text-xs text-slate-400">(solo un admin la cambia)</span>}
              </label>
              <input
                name="join_date"
                type="date"
                defaultValue={m.join_date ?? ""}
                disabled={!isAdmin}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-500"
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
            <SubmitButton
              variant="primary"
              pendingLabel="Guardando..."
              className="rounded-md px-4 py-2 text-sm font-medium"
            >
              Guardar cambios
            </SubmitButton>
          </div>
        </form>

        {isAdmin && (
          <form
            action={deleteWithId}
            className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700"
          >
            <ConfirmSubmitButton
              confirmMessage={`¿Eliminar a ${m.full_name} del equipo? Esta acción no se puede deshacer.`}
              className="text-sm text-red-600 hover:underline dark:text-red-400"
            >
              Eliminar integrante
            </ConfirmSubmitButton>
          </form>
        )}
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
          <SubmitButton
            variant="dark"
            pendingLabel="Agregando..."
            className="rounded-md px-3 py-1.5 text-sm font-medium"
          >
            + Agregar nota de seguimiento
          </SubmitButton>
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

      <section
        id="disponibilidad"
        className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <h2 className="mb-1 text-sm font-semibold text-nexa-navy dark:text-white">
          Disponibilidad horaria
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Marca cómo suele estar {m.full_name.split(" ")[0]} cada hora: libre, probablemente
          ocupado, u ocupado. Se usa en{" "}
          <Link href="/schedule" className="text-nexa-blue hover:underline">
            Horarios
          </Link>{" "}
          para cruzar disponibilidad con el resto del equipo.
        </p>
        <AvailabilityGrid initialSlots={initialSlots} onSave={saveAvailabilityWithId} />
      </section>
    </div>
  );
}
