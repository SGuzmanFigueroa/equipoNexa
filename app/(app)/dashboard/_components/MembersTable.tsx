import Link from "next/link";
import InitialsAvatar from "@/components/Avatar";
import { StatusBadge } from "@/components/Badge";
import { STATUS_LABELS } from "@/lib/types";
import { formatDateDMY, type DirectoryMember, type SortDir, type SortKey } from "@/lib/member-filters";
import { SortIcon } from "./icons";

function LeaderBadge() {
  return (
    <span
      title="Líder"
      className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50"
    >
      Líder
    </span>
  );
}

function ProjectBadges({ member }: { member: DirectoryMember }) {
  if (member.projects.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {member.projects.map((p) => (
        <span
          key={p.id}
          title={p.name}
          className="rounded-md bg-nexa-light/70 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-nexa-blue ring-1 ring-inset ring-nexa-blue/15 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800/50"
        >
          {p.code}
        </span>
      ))}
    </div>
  );
}

function SortableHeader({
  label,
  column,
  sort,
  dir,
  onSort,
  className = "",
}: {
  label: string;
  column: SortKey;
  sort: SortKey | "";
  dir: SortDir;
  onSort: (column: SortKey) => void;
  className?: string;
}) {
  const active = sort === column;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-4 py-3 font-semibold ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-nexa-navy dark:hover:text-white ${
          active ? "text-nexa-navy dark:text-white" : ""
        }`}
      >
        {label}
        <span className={active ? "text-nexa-blue dark:text-blue-300" : "opacity-40"}>
          <SortIcon dir={active ? dir : null} />
        </span>
      </button>
    </th>
  );
}

export default function MembersTable({
  members,
  sort,
  dir,
  onSort,
}: {
  members: DirectoryMember[];
  sort: SortKey | "";
  dir: SortDir;
  onSort: (column: SortKey) => void;
}) {
  return (
    <>
      {/* Escritorio / tablet */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(10,31,68,0.04)] dark:border-slate-700 dark:bg-slate-800 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <SortableHeader label="Nombre" column="full_name" sort={sort} dir={dir} onSort={onSort} className="w-[28%]" />
                <SortableHeader label="Área" column="area" sort={sort} dir={dir} onSort={onSort} />
                <SortableHeader label="Cargo" column="position" sort={sort} dir={dir} onSort={onSort} />
                <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                  Proyectos
                </th>
                <SortableHeader label="Ingreso" column="join_date" sort={sort} dir={dir} onSort={onSort} className="w-[1%] whitespace-nowrap" />
                <th scope="col" className="w-[1%] px-4 py-3 font-semibold uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
              {members.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <InitialsAvatar name={m.full_name} size="md" />
                      <Link
                        href={`/members/${m.id}`}
                        className="truncate font-medium text-slate-800 hover:text-nexa-blue hover:underline dark:text-slate-100 dark:hover:text-blue-300"
                      >
                        {m.full_name}
                      </Link>
                      {m.is_leader && <LeaderBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.area ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.position ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3">
                    <ProjectBadges member={m} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                    {formatDateDMY(m.join_date) ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={m.status} label={STATUS_LABELS[m.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Móvil: tarjetas */}
      <ul className="space-y-2 md:hidden">
        {members.map((m) => (
          <li key={m.id}>
            <Link
              href={`/members/${m.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(10,31,68,0.04)] active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <InitialsAvatar name={m.full_name} size="md" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
                      <span className="truncate">{m.full_name}</span>
                      {m.is_leader && <LeaderBadge />}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {m.position ?? "Sin cargo"} · {m.area ?? "Sin área"}
                    </p>
                  </div>
                </div>
                <StatusBadge status={m.status} label={STATUS_LABELS[m.status]} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <ProjectBadges member={m} />
                <span className="shrink-0 whitespace-nowrap tabular-nums text-slate-500 dark:text-slate-400">
                  {formatDateDMY(m.join_date) ?? "Sin fecha"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
