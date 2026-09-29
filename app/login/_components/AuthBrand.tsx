// Panel de marca del login (decorativo, sin estado). Misma familia visual
// que el login de Nexa Tracker: panel azul marino, grilla y halo sutiles y
// la "N" de Nexa (el proyecto no tiene un logo en archivo).

const GRID = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
  backgroundSize: "44px 44px",
  maskImage: "radial-gradient(ellipse at 30% 40%, black 30%, transparent 80%)",
  WebkitMaskImage: "radial-gradient(ellipse at 30% 40%, black 30%, transparent 80%)",
};

const FEATURES = [
  {
    label: "Gestión de integrantes",
    detail: "Fichas, estados y datos de cada persona del equipo.",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    label: "Seguimiento de proyectos",
    detail: "Quién participa en cada proyecto de Nexa.",
    icon: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  },
  {
    label: "Organización de horarios",
    detail: "Disponibilidad semanal para coordinar reuniones.",
    icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  },
];

export function NexaMark({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-nexa-sky to-nexa-blue font-bold text-white shadow-[0_8px_20px_-8px_rgba(41,182,246,0.9)] ${
        size === "md" ? "h-11 w-11 rounded-xl text-xl" : "h-10 w-10 rounded-[10px] text-lg"
      }`}
    >
      N
    </span>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <NexaMark />
      <div>
        <p className="text-base font-bold tracking-wide text-white">Equipo Nexa</p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200/60">Nexa Consulting TI</p>
      </div>
    </div>
  );
}

function Backdrop() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0" style={GRID} />
      <div
        className="pointer-events-none absolute -right-48 -top-48 h-[520px] w-[520px] rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, var(--nexa-blue) 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-56 -left-40 h-[480px] w-[480px] rounded-full opacity-[0.18]"
        style={{ background: "radial-gradient(circle, var(--nexa-sky) 0%, transparent 65%)" }}
      />
    </>
  );
}

export default function AuthBrand() {
  return (
    <aside
      className="relative hidden shrink-0 overflow-hidden bg-nexa-navy md:flex md:w-[40%] lg:w-[50%]"
      aria-label="Equipo Nexa"
    >
      <Backdrop />
      <div className="relative flex min-h-[100dvh] w-full flex-col justify-between px-8 py-10 lg:px-16 lg:py-12 xl:px-20">
        <Wordmark />

        <div className="max-w-[540px] py-12">
          <p className="text-[13px] font-medium text-nexa-sky">Gestión de integrantes de Nexa Consulting TI</p>
          <h2 className="mt-3 text-balance text-[24px] font-bold leading-[1.2] tracking-tight text-white lg:text-[34px] xl:text-[38px]">
            Organiza el equipo, proyectos y actividades de Nexa desde un solo lugar.
          </h2>

          <ul className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-nexa-sky ring-1 ring-white/10">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={f.icon} />
                  </svg>
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-white">{f.label}</span>
                  <span className="block text-[13.5px] text-blue-100/65">{f.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12px] tracking-wide text-blue-200/50">
          © {new Date().getFullYear()} Nexa Consulting TI · Uso interno
        </p>
      </div>
    </aside>
  );
}

/** Versión compacta para móvil, donde el panel lateral no se muestra. */
export function AuthBrandMobile() {
  return (
    <div className="flex flex-col items-center gap-3 pb-6 pt-2 text-center md:hidden">
      <NexaMark />
      <div>
        <p className="text-lg font-bold text-nexa-navy dark:text-white">Equipo Nexa</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de integrantes de Nexa Consulting TI</p>
      </div>
    </div>
  );
}
