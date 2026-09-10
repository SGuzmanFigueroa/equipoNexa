import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import SubmitButton from "@/components/SubmitButton";
import SuccessBanner from "@/components/SuccessBanner";
import { StatusBadge } from "@/components/Badge";
import { saveMyAvailability, updateMyProfile } from "./actions";
import {
  CAREER_OPTIONS,
  ROLE_OPTIONS,
  STATUS_LABELS,
  encodeSlot,
  type TeamMember,
  type AvailabilityStatus,
  type Project,
} from "@/lib/types";

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const profile = await requireProfile();
  if (profile.role === "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("*")
    .eq("profile_id", profile.id)
    .single();

  if (!member) {
    return (
      <div className="max-w-xl">
        <h1 className="mb-2 text-xl font-semibold text-nexa-navy dark:text-white">
          Todavía no estás vinculado
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tu cuenta ({profile.email}) inició sesión bien, pero un admin aún no la vinculó a tu
          ficha de integrante en Equipo Nexa. Pídele que lo haga desde tu ficha, en el campo
          &quot;Cuenta vinculada (login)&quot;.
        </p>
      </div>
    );
  }

  const m = member as TeamMember;
  const [{ data: allProjects }, { data: memberProjects }, { data: availability }] =
    await Promise.all([
      supabase.from("projects").select("id, name, code").order("name"),
      supabase.from("team_member_projects").select("project_id").eq("member_id", m.id),
      supabase
        .from("team_member_availability")
        .select("day_of_week, hour, status")
        .eq("member_id", m.id),
    ]);

  const selectedProjectIds = new Set((memberProjects ?? []).map((mp) => mp.project_id));
  const initialSlots = (availability ?? []).map((a) =>
    encodeSlot(a.day_of_week, a.hour, a.status as AvailabilityStatus),
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-nexa-navy dark:text-white">{m.full_name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tu ficha en Equipo Nexa</p>
      </div>

      {success && <SuccessBanner message={success} />}
      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-nexa-navy dark:text-white">
            Tu estado (solo un admin puede cambiarlo)
          </h2>
          <StatusBadge status={m.status} label={STATUS_LABELS[m.status]} />
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Área en Nexa</dt>
            <dd className="text-slate-700 dark:text-slate-200">{m.area ?? "Sin asignar"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Fecha de ingreso</dt>
            <dd className="text-slate-700 dark:text-slate-200">{m.join_date ?? "Sin registrar"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-1 text-sm font-semibold text-nexa-navy dark:text-white">Tu perfil</h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Esto sí lo puedes editar tú mismo.
        </p>
        <form action={updateMyProfile} className="space-y-4">
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
                Rol
              </label>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Teléfono
              </label>
              <input
                name="phone"
                defaultValue={m.phone ?? ""}
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Área favorita (de tu carrera)
              </label>
              <input
                name="favorite_area"
                defaultValue={m.favorite_area ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Proyectos en los que estás
            </label>
            <div className="flex flex-wrap gap-2">
              {(allProjects as Pick<Project, "id" | "name" | "code">[] | null)?.map((p) => (
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
              {allProjects?.length === 0 && (
                <p className="text-sm text-slate-400">Todavía no hay proyectos creados.</p>
              )}
            </div>
          </div>

          <SubmitButton
            variant="primary"
            pendingLabel="Guardando..."
            className="rounded-md px-4 py-2 text-sm font-medium"
          >
            Guardar perfil
          </SubmitButton>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-1 text-sm font-semibold text-nexa-navy dark:text-white">
          Tu disponibilidad horaria
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Marca cómo sueles estar, de lunes a domingo: libre, probablemente ocupado, u ocupado. El
          admin la usa en Horarios para cruzarla con la del resto del equipo.
        </p>
        <AvailabilityGrid initialSlots={initialSlots} onSave={saveMyAvailability} />
      </section>
    </div>
  );
}
