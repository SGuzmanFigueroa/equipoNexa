import Link from "next/link";
import { formatDateDMY } from "@/lib/member-filters";
import { ClockIcon } from "./icons";

export type LeavingMember = { id: string; full_name: string; end_date: string; days: number };

function whenLabel(days: number) {
  if (days < 0) return `terminó hace ${-days} día${days === -1 ? "" : "s"}`;
  if (days === 0) return "termina hoy";
  if (days === 1) return "termina mañana";
  return `en ${days} días`;
}

// Solo para el admin: integrantes activos cuyas prácticas terminan pronto
// (o ya terminaron y siguen como "Activo"), para preparar su salida.
export default function LeavingSoonNotice({ members, windowDays }: { members: LeavingMember[]; windowDays: number }) {
  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50/70 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 ring-1 ring-amber-300/60 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/60">
          <ClockIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {members.length === 1 ? "1 integrante está" : `${members.length} integrantes están`} por terminar sus prácticas
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Activos cuya fecha de salida cae en los próximos {windowDays} días o ya pasó. Solo lo ve el admin.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {members.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/members/${m.id}`}
                  title={`Fecha de salida: ${formatDateDMY(m.end_date)}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-xs font-medium transition-colors dark:bg-slate-800 ${
                    m.days <= 7
                      ? "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                      : "border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/40"
                  }`}
                >
                  {m.full_name}
                  <span className="font-normal opacity-80">
                    · {formatDateDMY(m.end_date)} ({whenLabel(m.days)})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
