import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import SubmitButton from "@/components/SubmitButton";
import FlashToast from "@/components/FlashToast";
import EmptyState from "@/components/EmptyState";
import ProjectCardMenu from "@/components/ProjectCardMenu";
import { createProject, deleteProject } from "./actions";
import type { Project } from "@/lib/types";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const { error, success } = await searchParams;
  const supabase = await createClient();

  const [{ data: projects }, { data: assignments }] = await Promise.all([
    supabase.from("projects").select("id, name, slug, code, description").order("name"),
    supabase
      .from("team_member_projects")
      .select("project_id, member:team_members(full_name, profile_id)"),
  ]);

  type AssignmentMember = { full_name: string; profile_id: string | null };
  const memberProfileIds = Array.from(
    new Set(
      (assignments ?? [])
        .map((a) => (a.member as unknown as AssignmentMember | null)?.profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const { data: roles } =
    memberProfileIds.length > 0
      ? await supabase.from("profiles").select("id, role").in("id", memberProfileIds)
      : { data: [] };
  const roleByProfileId = new Map((roles ?? []).map((p) => [p.id, p.role]));

  const counts = new Map<string, number>();
  const leaderByProject = new Map<string, string>();
  for (const a of assignments ?? []) {
    counts.set(a.project_id, (counts.get(a.project_id) ?? 0) + 1);
    const member = a.member as unknown as AssignmentMember | null;
    if (
      member?.profile_id &&
      roleByProfileId.get(member.profile_id) === "lider" &&
      !leaderByProject.has(a.project_id)
    ) {
      leaderByProject.set(a.project_id, member.full_name);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold text-nexa-navy dark:text-white">Proyectos</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Los frentes de Nexa a los que puedes asignar integrantes. Esta lista es compartida con el
        Gestor de Tickets.
      </p>

      <FlashToast success={success} error={error} />

      <form
        action={createProject}
        className="mb-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="min-w-[160px] flex-1 basis-full sm:basis-auto">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Nombre del proyecto
          </label>
          <input
            name="name"
            required
            placeholder="Ej: Nuevo producto"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="w-28 basis-full sm:basis-auto">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Código
          </label>
          <input
            name="code"
            required
            maxLength={5}
            placeholder="Ej: NEW"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="min-w-[160px] flex-1 basis-full sm:basis-auto">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Descripción
          </label>
          <input
            name="description"
            placeholder="Opcional"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <SubmitButton
          variant="primary"
          pendingLabel="Agregando..."
          className="rounded-md px-3 py-2 text-sm font-medium"
        >
          + Agregar proyecto
        </SubmitButton>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(projects as Project[] | null)?.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-nexa-light text-xs font-semibold text-nexa-blue dark:bg-blue-950/40 dark:text-blue-300">
                {p.code}
              </span>
              <ProjectCardMenu projectId={p.id} projectName={p.name} deleteProject={deleteProject} />
            </div>

            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.name}</p>
            {p.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                {p.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {counts.get(p.id) ?? 0} integrante{(counts.get(p.id) ?? 0) === 1 ? "" : "s"}
              </span>
              {leaderByProject.has(p.id) && (
                <span>
                  Líder <span className="font-medium text-slate-700 dark:text-slate-200">{leaderByProject.get(p.id)}</span>
                </span>
              )}
            </div>

            <Link
              href={`/projects/${p.id}`}
              className="mt-3 self-start rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-nexa-blue/40 hover:text-nexa-blue dark:border-slate-600 dark:text-slate-300 dark:hover:text-blue-300"
            >
              Ver proyecto
            </Link>
          </div>
        ))}
        {projects?.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState
              title="Todavía no hay proyectos."
              description="Crea el primero con el formulario de arriba."
            />
          </div>
        )}
      </div>
    </div>
  );
}
