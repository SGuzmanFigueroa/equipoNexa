const VARIANT_STYLES = {
  warning:
    "border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200",
  info: "border-nexa-blue/30 bg-nexa-light/60 text-nexa-navy dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100",
  danger:
    "border-red-300/60 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300",
} as const;

const ICON = {
  warning: "⚠",
  info: "ℹ",
  danger: "✕",
} as const;

export default function Alert({
  variant = "info",
  children,
  className = "",
}: {
  variant?: keyof typeof VARIANT_STYLES;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border p-4 text-sm ${VARIANT_STYLES[variant]} ${className}`}>
      <div className="flex items-start gap-2">
        <span aria-hidden className="mt-0.5 shrink-0">
          {ICON[variant]}
        </span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
