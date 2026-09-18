function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return initials || "?";
}

const SIZE_STYLES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-sm",
} as const;

export default function InitialsAvatar({
  name,
  size = "sm",
  className = "",
}: {
  name: string;
  size?: keyof typeof SIZE_STYLES;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-nexa-light font-semibold text-nexa-blue dark:bg-blue-950/40 dark:text-blue-300 ${SIZE_STYLES[size]} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
