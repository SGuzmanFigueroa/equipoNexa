import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLeader } from "@/lib/auth";
import FlashToast from "@/components/FlashToast";
import Alert from "@/components/Alert";
import type { MemberStatus, Profile } from "@/lib/types";
import type { DirectoryMember, DirectoryProject } from "@/lib/member-filters";
import MembersDirectory from "./_components/MembersDirectory";
import { DownloadIcon, InfoIcon, PlusIcon } from "./_components/icons";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { isAdmin } = await requireAdminOrLeader();
  const { success } = await searchParams;
  const supabase = await createClient();

  // Una sola carga en paralelo; el filtrado/orden se hace en el cliente
  // (MembersDirectory) sin volver a consultar al servidor.
  const [
    { data: memberRows, error },
    { data: profiles },
    { data: memberProjects },
    { data: projectRows },
  ] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, email, area, career, position, join_date, status, profile_id"),
    supabase.from("profiles").select("id, email, full_name, role, created_at"),
    supabase.from("team_member_projects").select("member_id, project_id"),
    supabase.from("projects").select("id, name, code").order("code"),
  ]);

  const projects = (projectRows ?? []) as DirectoryProject[];
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const projectsByMember = new Map<string, DirectoryProject[]>();
  for (const mp of memberProjects ?? []) {
    const project = projectById.get(mp.project_id);
    if (!project) continue;
    const list = projectsByMember.get(mp.member_id) ?? [];
    list.push(project);
    projectsByMember.set(mp.member_id, list);
  }

  const roleByProfileId = new Map((profiles ?? []).map((p) => [p.id, p.role]));
  const members: DirectoryMember[] = (memberRows ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    area: m.area ?? m.career ?? null,
    position: m.position ?? null,
    join_date: m.join_date ?? null,
    status: m.status as MemberStatus,
    is_leader: !!m.profile_id && roleByProfileId.get(m.profile_id) === "lider",
    projects: (projectsByMember.get(m.id) ?? []).sort((a, b) => a.code.localeCompare(b.code)),
  }));

  const memberEmails = new Set(
    (memberRows ?? []).map((m) => m.email?.toLowerCase()).filter(Boolean),
  );
  const unlinkedProfiles = ((profiles ?? []) as Profile[]).filter(
    (p) => !memberEmails.has(p.email.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <FlashToast success={success} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-nexa-navy dark:text-white">Integrantes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gestiona los miembros, cargos, proyectos y estados del equipo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/report"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(10,31,68,0.04)] transition-colors hover:border-nexa-blue/40 hover:text-nexa-blue dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:text-blue-300"
          >
            <DownloadIcon />
            Descargar reporte
          </a>
          <Link
            href="/members/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-nexa-blue px-4 text-sm font-medium text-white shadow-sm shadow-nexa-blue/20 transition-colors hover:bg-nexa-navy dark:hover:bg-blue-700"
          >
            <PlusIcon />
            Nuevo integrante
          </Link>
        </div>
      </div>

      {error && <Alert variant="danger">Error cargando integrantes: {error.message}</Alert>}

      <MembersDirectory
        members={members}
        projects={projects}
        canGenerateLetter={isAdmin}
        notice={unlinkedProfiles.length > 0 && <UnlinkedAccountsNotice profiles={unlinkedProfiles} />}
      />
    </div>
  );
}

function UnlinkedAccountsNotice({ profiles }: { profiles: Profile[] }) {
  const n = profiles.length;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-nexa-blue/20 bg-nexa-light/50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/20 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-nexa-blue ring-1 ring-nexa-blue/15 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800/60">
          <InfoIcon />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-nexa-navy dark:text-blue-100">
            {n} cuenta{n === 1 ? "" : "s"} del Gestor de Tickets sin integrante en Equipo Nexa
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Tener login no crea el integrante: faltan datos como la fecha de ingreso. Agrégalos
            manualmente.
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5 lg:max-w-[55%] lg:justify-end">
        {profiles.map((p) => (
          <li key={p.id}>
            <Link
              href={`/members/new?full_name=${encodeURIComponent(p.full_name ?? "")}&email=${encodeURIComponent(p.email)}`}
              title={p.email}
              className="inline-flex items-center gap-1 rounded-full border border-nexa-blue/30 bg-white px-2.5 py-1 text-xs font-medium text-nexa-blue transition-colors hover:bg-nexa-blue hover:text-white dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              <PlusIcon className="h-3 w-3" />
              {p.full_name ?? p.email}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
