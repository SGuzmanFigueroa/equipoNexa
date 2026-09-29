import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import AvailabilityEditor from "@/components/AvailabilityEditor";
import SubmitButton from "@/components/SubmitButton";
import FlashToast from "@/components/FlashToast";
import { StatusBadge } from "@/components/Badge";
import { saveMyAvailability, updateMyProfile } from "./actions";
import {
  CAREER_OPTIONS,
  DNI_INPUT_PROPS,
  ROLE_OPTIONS,
  STATUS_LABELS,
  encodeSlot,
  missingProfileFields,
  type TeamMember,
  type AvailabilityStatus,
  type Project,
} from "@/lib/types";

const INPUT_CLASS =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800";
const LABEL_CLASS = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";
const HINT_CLASS = "mt-1 text-xs text-slate-400";

function Required() {
  return <span className="text-red-500">*</span>;
}

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
  const missing = missingProfileFields(m);
  const incomplete = missing.length > 0;

  const profileSection = (
    <section
      id="perfil"
      className={`rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-800 ${
        incomplete
          ? "border-amber-300 dark:border-amber-900/60"
          : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <h2 className="mb-1 text-sm font-semibold text-nexa-navy dark:text-white">Tu perfil</h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Los campos con <Required /> son obligatorios. DNI, área en Nexa y fecha de ingreso solo los
        puedes llenar la primera vez; después, solo un admin los cambia.
      </p>
      <form action={updateMyProfile} className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>
            Nombres y apellidos completos <Required />
          </label>
          <input
            name="full_name"
            required
            defaultValue={m.full_name ?? ""}
            placeholder="Ej: María Fernanda López Díaz"
            className={INPUT_CLASS}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={LABEL_CLASS}>
              DNI <Required />
            </label>
            <input
              name="dni"
              required={!m.dni}
              disabled={!!m.dni}
              defaultValue={m.dni ?? ""}
              {...DNI_INPUT_PROPS}
              className={INPUT_CLASS}
            />
            <p className={HINT_CLASS}>Una vez guardado, solo un admin lo cambia.</p>
          </div>
          <div>
            <label className={LABEL_CLASS}>
              Teléfono <Required />
            </label>
            <input
              name="phone"
              type="tel"
              required
              defaultValue={m.phone ?? ""}
              placeholder="Con código de país, ej: +51 987 654 321"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>
              LinkedIn <Required />
            </label>
            <input
              name="linkedin_url"
              type="url"
              required
              defaultValue={m.linkedin_url ?? ""}
              placeholder="Link a tu perfil: https://www.linkedin.com/in/tu-usuario"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={LABEL_CLASS}>
              Rol en Nexa <Required />
            </label>
            <select name="position" required defaultValue={m.position ?? ""} className={INPUT_CLASS}>
              <option value="" disabled>
                Elige el rol que te asignaron
              </option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              {m.position && !ROLE_OPTIONS.includes(m.position) && (
                <option value={m.position}>{m.position}</option>
              )}
            </select>
            <p className={HINT_CLASS}>El puesto que cumples en el equipo.</p>
          </div>
          <div>
            <label className={LABEL_CLASS}>
              Área en Nexa <Required />
            </label>
            <input
              name="area"
              required={!m.area}
              disabled={!!m.area}
              defaultValue={m.area ?? ""}
              placeholder="Equipo donde trabajas, ej: QA, Desarrollo, Marketing"
              className={INPUT_CLASS}
            />
            <p className={HINT_CLASS}>El equipo o área de Nexa en el que estás.</p>
          </div>
          <div>
            <label className={LABEL_CLASS}>
              Fecha de ingreso <Required />
            </label>
            <input
              name="join_date"
              type="date"
              required={!m.join_date}
              disabled={!!m.join_date}
              defaultValue={m.join_date ?? ""}
              className={INPUT_CLASS}
            />
            <p className={HINT_CLASS}>El día en que empezaste en Nexa.</p>
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS}>
            Skills <Required />
          </label>
          <input
            name="skills"
            required
            defaultValue={m.skills ?? ""}
            placeholder="Herramientas y tecnologías que manejas, separadas por comas. Ej: Python, SQL, Figma, Selenium"
            className={INPUT_CLASS}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 dark:border-slate-700 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Edad</label>
            <input
              name="age"
              type="number"
              min={0}
              defaultValue={m.age ?? ""}
              placeholder="Ej: 22"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Carrera</label>
            <select name="career" defaultValue={m.career ?? ""} className={INPUT_CLASS}>
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
            <label className={LABEL_CLASS}>GitHub (usuario)</label>
            <input
              name="github_username"
              defaultValue={m.github_username ?? ""}
              placeholder="Solo el usuario, ej: mariafl"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Área favorita (de tu carrera)</label>
            <input
              name="favorite_area"
              defaultValue={m.favorite_area ?? ""}
              placeholder="Ej: QA Automation, Backend, UX"
              className={INPUT_CLASS}
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
  );

  return (
    <div className="max-w-3xl space-y-6">
      <FlashToast success={success} error={error} />

      {/* El aviso "Tienes datos pendientes" lo muestra el layout. */}
      {incomplete && profileSection}

      <div>
        <h1 className="text-xl font-semibold text-nexa-navy dark:text-white">Mi disponibilidad</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Indica en qué horarios normalmente puedes participar en reuniones o trabajar con el
          equipo.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <AvailabilityEditor initialSlots={initialSlots} onSave={saveMyAvailability} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-nexa-navy dark:text-white">
            Tu ficha en Nexa
          </h2>
          <StatusBadge status={m.status} label={STATUS_LABELS[m.status]} />
        </div>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          {m.full_name} · solo un admin puede cambiar tu estado.
        </p>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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

      {!incomplete && profileSection}
    </div>
  );
}
