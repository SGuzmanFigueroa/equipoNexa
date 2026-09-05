import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/Badge";
import { MEMBER_STATUSES, STATUS_LABELS, type TeamMember } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const supabase = await createClient();

  const { data: allMembers } = await supabase.from("team_members").select("status");

  const stats = {
    total: allMembers?.length ?? 0,
    activos: allMembers?.filter((m) => m.status === "activo").length ?? 0,
    pausados: allMembers?.filter((m) => m.status === "pausado").length ?? 0,
    retirados: allMembers?.filter((m) => m.status === "retirado").length ?? 0,
  };

  let query = supabase
    .from("team_members")
    .select("*")
    .order("join_date", { ascending: false });

  if (status) query = query.eq("status", status);
  if (q) query = query.or(`full_name.ilike.%${q}%,area.ilike.%${q}%,position.ilike.%${q}%`);

  const { data: members, error } = await query;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-nexa-navy">Integrantes</h1>
          <p className="text-sm text-slate-500">Equipo de Nexa Consulting TI</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/report"
            className="rounded-md border border-nexa-blue px-3 py-2 text-sm font-medium text-nexa-blue transition-colors hover:bg-nexa-light"
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
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-semibold text-nexa-navy">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600/80">
            Activos
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{stats.activos}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600/80">
            Pausados
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{stats.pausados}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Retirados</p>
          <p className="mt-1 text-2xl font-semibold text-slate-600">{stats.retirados}</p>
        </div>
      </div>

      <form className="mb-5 flex flex-wrap gap-2 text-sm" action="/dashboard">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, área o cargo..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 outline-none focus:border-nexa-blue"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 outline-none focus:border-nexa-blue"
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
          <Link href="/dashboard" className="rounded-md px-3 py-1.5 text-slate-500 hover:bg-slate-100">
            Limpiar
          </Link>
        )}
      </form>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Error cargando integrantes: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-nexa-light/50 text-xs uppercase tracking-wide text-nexa-navy/70">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Área</th>
                <th className="px-4 py-2 font-medium">Cargo</th>
                <th className="px-4 py-2 font-medium">Ingreso</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(members as TeamMember[] | null)?.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-nexa-light/30">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/members/${m.id}`}
                      className="font-medium text-slate-800 hover:text-nexa-blue hover:underline"
                    >
                      {m.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{m.area ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{m.position ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{m.join_date}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={m.status} label={STATUS_LABELS[m.status]} />
                  </td>
                </tr>
              ))}
              {members?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
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
