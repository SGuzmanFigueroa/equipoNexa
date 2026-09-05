import type { MemberStatus } from "@/lib/types";

const STATUS_STYLES: Record<MemberStatus, string> = {
  activo: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  pausado: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  retirado: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

export function StatusBadge({ status, label }: { status: MemberStatus; label: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}
