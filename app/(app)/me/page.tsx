import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import { StatusBadge } from "@/components/Badge";
import { saveMyAvailability } from "./actions";
import { STATUS_LABELS, slotKey, type TeamMember } from "@/lib/types";

export default async function MePage() {
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
  const [{ data: memberProjects }, { data: availability }] = await Promise.all([
    supabase.from("team_member_projects").select("project:projects(name, code)").eq("member_id", m.id),
    supabase.from("team_member_availability").select("day_of_week, hour").eq("member_id", m.id),
  ]);

  const projectNames = (memberProjects ?? [])
    .map((mp) => (mp.project as unknown as { name: string } | null)?.name)
    .filter((n): n is string => Boolean(n));
  const initialSlots = (availability ?? []).map((a) => slotKey(a.day_of_week, a.hour));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-nexa-navy dark:text-white">{m.full_name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tu ficha en Equipo Nexa</p>
      </div>

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
            <dt className="text-xs uppercase tracking-wide text-slate-400">Cargo en Nexa</dt>
            <dd className="text-slate-700 dark:text-slate-200">{m.position ?? "Sin asignar"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Fecha de ingreso</dt>
            <dd className="text-slate-700 dark:text-slate-200">{m.join_date ?? "Sin registrar"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Proyectos</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {projectNames.length > 0 ? projectNames.join(", ") : "Sin asignar"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-1 text-sm font-semibold text-nexa-navy dark:text-white">
          Tu disponibilidad horaria
        </h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Marca las horas en las que sueles estar libre, de lunes a domingo. El admin la usa en
          Horarios para cruzarla con la del resto del equipo.
        </p>
        <AvailabilityGrid initialSlots={initialSlots} onSave={saveMyAvailability} />
      </section>
    </div>
  );
}
