import type { MemberStatus } from "@/lib/types";
import { ArchiveIcon, CheckCircleIcon, PauseCircleIcon, UsersIcon } from "./icons";

type CardKey = MemberStatus | "";

const CARDS: {
  key: CardKey;
  label: string;
  icon: (p: { className?: string }) => React.ReactNode;
  iconClass: string;
  numberClass: string;
  activeClass: string;
}[] = [
  {
    key: "",
    label: "Total",
    icon: UsersIcon,
    iconClass: "bg-nexa-light text-nexa-blue dark:bg-blue-950/50 dark:text-blue-300",
    numberClass: "text-nexa-navy dark:text-white",
    activeClass: "border-nexa-blue/60 ring-2 ring-nexa-blue/15 dark:border-blue-500/60 dark:ring-blue-500/20",
  },
  {
    key: "activo",
    label: "Activos",
    icon: CheckCircleIcon,
    iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
    numberClass: "text-emerald-700 dark:text-emerald-300",
    activeClass: "border-emerald-400/70 ring-2 ring-emerald-500/15 dark:border-emerald-600/60 dark:ring-emerald-500/20",
  },
  {
    key: "pausado",
    label: "Pausados",
    icon: PauseCircleIcon,
    iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
    numberClass: "text-amber-700 dark:text-amber-300",
    activeClass: "border-amber-400/70 ring-2 ring-amber-500/15 dark:border-amber-600/60 dark:ring-amber-500/20",
  },
  {
    key: "retirado",
    label: "Retirados",
    icon: ArchiveIcon,
    iconClass: "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300",
    numberClass: "text-slate-600 dark:text-slate-300",
    activeClass: "border-slate-400/70 ring-2 ring-slate-400/20 dark:border-slate-500 dark:ring-slate-500/20",
  },
];

// Tarjetas de resumen clickeables: aplican (o quitan) el filtro de estado.
export default function SummaryCards({
  counts,
  status,
  onSelect,
}: {
  counts: Record<CardKey, number>;
  status: CardKey;
  onSelect: (status: CardKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => {
        const active = status === card.key;
        const Icon = card.icon;
        return (
          <button
            key={card.label}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(card.key)}
            title={card.key ? `Ver solo ${card.label.toLowerCase()}` : "Ver todos los estados"}
            className={`group flex items-center justify-between gap-3 rounded-xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(10,31,68,0.04)] transition-all hover:-translate-y-px hover:shadow-md hover:shadow-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-blue/40 dark:bg-slate-800 dark:hover:shadow-black/20 ${
              active ? card.activeClass : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
            }`}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums sm:text-3xl ${card.numberClass}`}>
                {counts[card.key]}
              </p>
            </div>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconClass}`}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
