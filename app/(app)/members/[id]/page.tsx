import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLeader } from "@/lib/auth";
import SubmitButton from "@/components/SubmitButton";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import FlashToast from "@/components/FlashToast";
import AvailabilityEditor from "@/components/AvailabilityEditor";
import InitialsAvatar from "@/components/Avatar";
import { StatusBadge } from "@/components/Badge";
import Tabs from "@/components/Tabs";
import ReadEditToggle from "@/components/ReadEditToggle";
import { updateMember, deleteMember, addTrackingEntry, saveAvailability } from "./actions";
import {
  CAREER_OPTIONS,
  MEMBER_STATUSES,
  ROLE_LABELS,
  ROLE_OPTIONS,
  STATUS_LABELS,
  encodeSlot,
  type TeamMember,
  type TrackingEntry,
  type Project,
  type Profile,
  type AvailabilityStatus,
} from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-500";
const labelClass = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-700 dark:text-slate-200">
        {value || <span className="text-slate-400">Sin especificar</span>}
      </dd>
    </div>
  );
}

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
    supabase.from("profiles").select("id, email, full_name, role").order("email"),
  ]);

  if (!member) notFound();

  const m = member as TeamMember;
  const linkedProfile = (allProfiles as Profile[] | null)?.find((p) => p.id === m.profile_id);
  const selectedProjectIds = new Set((memberProjects ?? []).map((mp) => mp.project_id));
  const assignedProjects = ((projects ?? []) as Pick<Project, "id" | "name" | "code">[]).filter((p) =>
    selectedProjectIds.has(p.id),
  );
  const initialSlots = (availability ?? []).map((a) =>
    encodeSlot(a.day_of_week, a.hour, a.status as AvailabilityStatus),
  );
  const updateWithId = updateMember.bind(null, id);
  const deleteWithId = deleteMember.bind(null, id);
  const addTrackingWithId = addTrackingEntry.bind(null, id);
  const saveAvailabilityWithId = saveAvailability.bind(null, id);

  const informacionTab = (
    <ReadEditToggle
      editLabel="Editar información"
      readView={
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teléfono" value={m.phone} />
          <Field label="Edad" value={m.age} />
          <Field label="Carrera" value={m.career} />
          <Field label="Rol de último trabajo" value={m.last_job_role} />
          <Field
            label="LinkedIn"
            value={
              m.linkedin_url && (
                <a href={m.linkedin_url} target="_blank" rel="noreferrer" className="text-nexa-blue hover:underline">
                  Ver perfil
                </a>
              )
            }
          />
          <Field label="GitHub" value={m.github_username} />
          <Field label="Skills" value={m.skills} />
          <Field label="Área favorita" value={m.favorite_area} />
        </dl>
      }
      editView={
        <form action={updateWithId} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Teléfono</label>
              <input name="phone" defaultValue={m.phone ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Edad</label>
              <input name="age" type="number" min={0} defaultValue={m.age ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Carrera</label>
              <select name="career" defaultValue={m.career ?? ""} className={inputClass}>
                <option value="">Sin especificar</option>
                {CAREER_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {m.career && !CAREER_OPTIONS.includes(m.career) && <option value={m.career}>{m.career}</option>}
              </select>
            </div>
            <div>
              <label className={labelClass}>Rol de último trabajo</label>
              <input name="last_job_role" defaultValue={m.last_job_role ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>LinkedIn</label>
              <input name="linkedin_url" type="url" defaultValue={m.linkedin_url ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>GitHub (usuario)</label>
              <input name="github_username" defaultValue={m.github_username ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Skills</label>
              <input name="skills" defaultValue={m.skills ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Área favorita</label>
              <input name="favorite_area" defaultValue={m.favorite_area ?? ""} className={inputClass} />
            </div>
          </div>
          <SubmitButton variant="primary" pendingLabel="Guardando..." className="rounded-md px-4 py-2 text-sm font-medium">
            Guardar información
          </SubmitButton>
        </form>
      }
    />
  );

  const nexaTab = (
    <ReadEditToggle
      editLabel="Editar datos de Nexa"
      readView={
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" value={m.full_name} />
            <Field label="Correo" value={m.email} />
            <Field label="Área en Nexa" value={m.area} />
            <Field label="Cargo en Nexa" value={m.position} />
            <Field label="Tipo de colaboración" value={m.collaboration_type} />
            <Field label="Fecha de ingreso" value={m.join_date} />
            <Field label="Fecha de salida" value={m.end_date} />
            <Field label="Estado" value={<StatusBadge status={m.status} label={STATUS_LABELS[m.status]} />} />
          </dl>
          {m.notes && <Field label="Notas" value={m.notes} />}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Cuenta vinculada:{" "}
              {linkedProfile ? (
                <span className="font-medium">{linkedProfile.full_name ?? linkedProfile.email}</span>
              ) : (
                <span className="text-slate-400">Sin vincular</span>
              )}
            </p>
            {linkedProfile && (
              <p className="mt-1 text-xs text-slate-400">
                Rol de acceso: <span className="font-medium">{ROLE_LABELS[linkedProfile.role]}</span> — se
                asigna desde <strong>Usuarios y roles</strong> en el Gestor de Tickets.
              </p>
            )}
          </div>
        </div>
      }
      editView={
        <form action={updateWithId} className="space-y-4">
          <div>
            <label className={labelClass}>
              Nombre completo{" "}
              {!isAdmin && <span className="text-xs text-slate-400">(solo un admin lo cambia)</span>}
            </label>
            <input name="full_name" defaultValue={m.full_name} required disabled={!isAdmin} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Correo {!isAdmin && <span className="text-xs text-slate-400">(solo un admin lo cambia)</span>}
              </label>
              <input name="email" type="email" defaultValue={m.email ?? ""} disabled={!isAdmin} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Área en Nexa</label>
              <input name="area" defaultValue={m.area ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Cargo en Nexa</label>
              <select name="position" defaultValue={m.position ?? ""} className={inputClass}>
                <option value="">Sin especificar</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {m.position && !ROLE_OPTIONS.includes(m.position) && <option value={m.position}>{m.position}</option>}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tipo de colaboración</label>
              <input name="collaboration_type" defaultValue={m.collaboration_type ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>
                Fecha de ingreso{" "}
                {!isAdmin && <span className="text-xs text-slate-400">(solo un admin la cambia)</span>}
              </label>
              <input
                name="join_date"
                type="date"
                defaultValue={m.join_date ?? ""}
                disabled={!isAdmin}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de salida</label>
              <input name="end_date" type="date" defaultValue={m.end_date ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select name="status" defaultValue={m.status} className={inputClass}>
                {MEMBER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <textarea name="notes" rows={3} defaultValue={m.notes ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>
              Cuenta vinculada (login){" "}
              {!isAdmin && <span className="text-xs text-slate-400">(solo un admin la cambia)</span>}
            </label>
            <select name="profile_id" defaultValue={m.profile_id ?? ""} disabled={!isAdmin} className={inputClass}>
              <option value="">Sin vincular</option>
              {(allProfiles as Pick<Profile, "id" | "email" | "full_name">[] | null)?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email} ({p.email})
                </option>
              ))}
            </select>
          </div>
          <SubmitButton variant="primary" pendingLabel="Guardando..." className="rounded-md px-4 py-2 text-sm font-medium">
            Guardar datos de Nexa
          </SubmitButton>
        </form>
      }
    />
  );

  const proyectosTab = (
    <ReadEditToggle
      editLabel="Editar proyectos"
      readView={
        assignedProjects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignedProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 hover:border-nexa-blue/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <span className="rounded bg-nexa-light px-1.5 py-0.5 text-xs font-medium text-nexa-blue dark:bg-blue-950/40 dark:text-blue-300">
                  {p.code}
                </span>
                {p.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No tiene proyectos asignados todavía.</p>
        )
      }
      editView={
        <form action={updateWithId} className="space-y-4">
          <input type="hidden" name="manage_project_ids" value="1" />
          <div className="flex flex-wrap gap-2">
            {(projects as Pick<Project, "id" | "name" | "code">[] | null)?.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <input type="checkbox" name="project_ids" value={p.id} defaultChecked={selectedProjectIds.has(p.id)} />
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
          <SubmitButton variant="primary" pendingLabel="Guardando..." className="rounded-md px-4 py-2 text-sm font-medium">
            Guardar proyectos
          </SubmitButton>
        </form>
      }
    />
  );

  const horarioTab = (
    <AvailabilityEditor
      initialSlots={initialSlots}
      onSave={saveAvailabilityWithId}
      ownerFirstName={m.full_name.split(" ")[0]}
    />
  );

  const seguimientoTab = (
    <div>
      <form action={addTrackingWithId} className="mb-5 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
          <input
            name="entry_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
          <input
            name="note"
            required
            placeholder="Ej: Reunión 1:1, avance de módulo, feedback..."
            className={inputClass}
          />
        </div>
        <SubmitButton variant="dark" pendingLabel="Agregando..." className="rounded-md px-3 py-1.5 text-sm font-medium">
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
              <span className="font-medium text-nexa-navy dark:text-blue-300">{t.entry_date}</span>
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
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <FlashToast success={success} error={error} />

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={m.full_name} size="md" />
            <div>
              <h1 className="text-lg font-semibold text-nexa-navy dark:text-white">
                {m.full_name}
                {linkedProfile?.role === "lider" && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    Líder
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {m.position ?? "Sin cargo"} · {m.area ?? "Sin área"}
              </p>
            </div>
          </div>
          <StatusBadge status={m.status} label={STATUS_LABELS[m.status]} />
        </div>

        {assignedProjects.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {assignedProjects.map((p) => (
              <span
                key={p.id}
                className="rounded bg-nexa-light px-1.5 py-0.5 text-xs font-medium text-nexa-blue dark:bg-blue-950/40 dark:text-blue-300"
              >
                {p.code}
              </span>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700">
            <form action={deleteWithId}>
              <ConfirmSubmitButton
                confirmMessage={`¿Eliminar a ${m.full_name} del equipo? Esta acción no se puede deshacer.`}
                className="text-xs text-red-500 hover:underline dark:text-red-400"
              >
                Eliminar integrante
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Tabs
          tabs={[
            { id: "informacion", label: "Información", content: informacionTab },
            { id: "nexa", label: "Nexa", content: nexaTab },
            { id: "proyectos", label: "Proyectos", content: proyectosTab },
            { id: "disponibilidad", label: "Horario", content: horarioTab },
            { id: "seguimiento", label: "Seguimiento", content: seguimientoTab },
          ]}
        />
      </div>
    </div>
  );
}
