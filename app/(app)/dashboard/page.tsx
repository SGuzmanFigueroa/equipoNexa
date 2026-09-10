import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import SuccessBanner from "@/components/SuccessBanner";
import { MEMBER_STATUSES, STATUS_LABELS, type Profile, type TeamMember } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; success?: string }>;
}) {
  const { status, q, success } = await searchParams;
  const supabase = await createClient();

  const [{ data: allMembers }, { data: profiles }, { data: memberProjects }] = await Promise.all([
    supabase.from("team_members").select("status, email"),
    supabase.from("profiles").select("id, email, full_name, role, created_at"),
    supabase.from("team_member_projects").select("member_id, project:projects(name, code)"),
  ]);

  const projectsByMember = new Map<string, string[]>();
  for (const mp of memberProjects ?? []) {
    const code = (mp.project as unknown as { code: string } | null)?.code;
    if (!code) continue;
    const list = projectsByMember.get(mp.member_id) ?? [];
    list.push(code);
    projectsByMember.set(mp.member_id, list);
  }

  const stats = {
    total: allMembers?.length ?? 0,
    activos: allMembers?.filter((m) => m.status === "activo").length ?? 0,
    pausados: allMembers?.filter((m) => m.status === "pausado").length ?? 0,
    retirados: allMembers?.filter((m) => m.status === "retirado").length ?? 0,
  };

  const memberEmails = new Set(
    (allMembers ?? []).map((m) => m.email?.toLowerCase()).filter(Boolean),
  );
  const unlinkedProfiles = ((profiles ?? []) as Profile[]).filter(
    (p) => !memberEmails.has(p.email.toLowerCase()),
  );

  let query = supabase
    .from("team_members")
    .select("*")
    .order("join_date", { ascending: false, nullsFirst: false })
    .order("full_name", { ascending: true });

  if (status) query = query.eq("status", status);
  if (q) query = query.or(`full_name.ilike.%${q}%,area.ilike.%${q}%,position.ilike.%${q}%`);

  const { data: members, error } = await query;

  return (
    <div>
      {success && <SuccessBanner message={success} />}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-nexa-navy dark:text-white">Integrantes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Equipo de Nexa Consulting TI
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/report"
            className="rounded-md border border-nexa-blue px-3 py-2 text-sm font-medium text-nexa-blue transition-colors hover:bg-nexa-light dark:hover:bg-blue-950/30"
          >
            Descargar reporte
          </a>
          <Link
            href="/members/new"
            className="rounded-md bg-nexa-blue px-3 py-2 text-sm font-medium text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy"
          >
            + Nuevo integrante
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-semibold text-nexa-navy dark:text-white">
            {stats.total}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600/80">
            Activos
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
            {stats.activos}
          </p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600/80">
            Pausados
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300">
            {stats.pausados}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Retirados</p>
          <p className="mt-1 text-2xl font-semibold text-slate-600 dark:text-slate-300">
            {stats.retirados}
          </p>
        </div>
      </div>

      {unlinkedProfiles.length > 0 && (
        <div className="mb-6 rounded-lg border border-nexa-blue/30 bg-nexa-light/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="mb-2 text-sm font-medium text-nexa-navy dark:text-blue-100">
            {unlinkedProfiles.length} cuenta{unlinkedProfiles.length === 1 ? "" : "s"} registrada
            {unlinkedProfiles.length === 1 ? "" : "s"} en el Gestor de Tickets todavía sin
            integrante en Equipo Nexa
          </p>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Tener cuenta (login) no crea automáticamente un integrante — faltan datos que esa
            cuenta no guarda, como la fecha real de ingreso. Revísalos y agrégalos manualmente:
          </p>
          <ul className="flex flex-wrap gap-2">
            {unlinkedProfiles.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/members/new?full_name=${encodeURIComponent(
                    p.full_name ?? "",
                  )}&email=${encodeURIComponent(p.email)}`}
                  className="flex items-center gap-1.5 rounded-full border border-nexa-blue/40 bg-white px-3 py-1 text-xs font-medium text-nexa-blue transition-colors hover:bg-nexa-blue hover:text-white dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-blue-900"
                >
                  + {p.full_name ?? p.email}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="mb-5 flex flex-wrap gap-2 text-sm" action="/dashboard">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, área o cargo..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 outline-none focus:border-nexa-blue dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 outline-none focus:border-nexa-blue dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Todos los estados</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-nexa-navy px-3 py-1.5 font-medium text-white hover:bg-slate-900"
        >
          Filtrar
        </button>
        {(status || q) && (
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Limpiar
          </Link>
        )}
      </form>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Error cargando integrantes: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-nexa-light/50 text-xs uppercase tracking-wide text-nexa-navy/70 dark:border-slate-700 dark:bg-slate-700/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Área</th>
                <th className="px-4 py-2 font-medium">Cargo</th>
                <th className="px-4 py-2 font-medium">Proyectos</th>
                <th className="px-4 py-2 font-medium">Ingreso</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(members as TeamMember[] | null)?.map((m) => (
                <tr
                  key={m.id}
                  className="transition-colors hover:bg-nexa-light/30 dark:hover:bg-slate-700/40"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/members/${m.id}`}
                      className="font-medium text-slate-800 hover:text-nexa-blue hover:underline dark:text-slate-100"
                    >
                      {m.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                    {m.area ?? m.career ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                    {m.position ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {(projectsByMember.get(m.id) ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {projectsByMember.get(m.id)!.map((code) => (
                          <span
                            key={code}
                            className="rounded bg-nexa-light px-1.5 py-0.5 text-xs font-medium text-nexa-blue dark:bg-blue-950/40 dark:text-blue-300"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                    {m.join_date ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={m.status} label={STATUS_LABELS[m.status]} />
                  </td>
                </tr>
              ))}
              {members?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No hay integrantes con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
