import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/Badge";
import SubmitButton from "@/components/SubmitButton";
import SuccessBanner from "@/components/SuccessBanner";
import { makeLeader } from "./actions";
import { ROLE_LABELS, STATUS_LABELS, type MemberStatus, type UserRole } from "@/lib/types";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error, success } = await searchParams;
  const supabase = await createClient();

  const [{ data: project }, { data: assignments }] = await Promise.all([
    supabase.from("projects").select("id, name, code, description").eq("id", id).single(),
    supabase
      .from("team_member_projects")
      .select("member:team_members(id, full_name, position, area, status, profile_id)")
      .eq("project_id", id),
  ]);

  if (!project) notFound();

  type MemberRow = {
    id: string;
    full_name: string;
    position: string | null;
    area: string | null;
    status: MemberStatus;
    profile_id: string | null;
  };

  const members = (assignments ?? [])
    .map((a) => a.member as unknown as MemberRow | null)
    .filter((m): m is MemberRow => m !== null);

  const profileIds = members.map((m) => m.profile_id).filter((p): p is string => Boolean(p));
  const profilesResult =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, role").in("id", profileIds)
      : { data: [] };
  const profiles = profilesResult.data as { id: string; role: UserRole }[] | null;

  const roleByProfileId = new Map<string, UserRole>((profiles ?? []).map((p) => [p.id, p.role]));

  return (
    <div className="max-w-2xl">
      <Link href="/projects" className="text-sm text-slate-500 hover:text-nexa-blue hover:underline dark:text-slate-400">
        ← Volver a proyectos
      </Link>

      <div className="mb-6 mt-2 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-nexa-light text-sm font-semibold text-nexa-blue dark:bg-blue-950/40 dark:text-blue-300">
          {project.code}
        </span>
        <div>
          <h1 className="text-xl font-semibold text-nexa-navy dark:text-white">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
          )}
        </div>
      </div>

      {success && <SuccessBanner message={success} />}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <h2 className="mb-2 text-sm font-semibold text-nexa-navy dark:text-white">
        Equipo asignado ({members.length})
      </h2>

      <div className="space-y-2">
        {members.map((m) => {
          const role = m.profile_id ? roleByProfileId.get(m.profile_id) : undefined;
          const makeLeaderForMember = makeLeader.bind(null, id, m.profile_id ?? "");
          return (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div>
                <Link
                  href={`/members/${m.id}`}
                  className="text-sm font-medium text-slate-800 hover:text-nexa-blue hover:underline dark:text-slate-100"
                >
                  {m.full_name}
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {m.position ?? "Sin cargo"} · {m.area ?? "Sin área"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={m.status} label={STATUS_LABELS[m.status]} />
                {!m.profile_id ? (
                  <span className="text-xs text-slate-400">Sin cuenta vinculada</span>
                ) : role === "admin" || role === "lider" ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {ROLE_LABELS[role]}
                  </span>
                ) : (
                  <form action={makeLeaderForMember}>
                    <SubmitButton
                      variant="ghost"
                      pendingLabel="..."
                      className="rounded-full border border-amber-300 px-2.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                    >
                      Hacer líder
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {members.length === 0 && (
          <p className="text-sm text-slate-400">
            Todavía no hay nadie asignado a este proyecto. Asígnalo desde la ficha de cada
            integrante.
          </p>
        )}
      </div>
    </div>
  );
}
