export type UserRole = "admin" | "lider" | "qa" | "developer" | "backend" | "frontend";

// Assigned from bug-tracker's "Usuarios y roles" page — same shared
// profiles.role, just also read here to gate admin/líder access and to
// display it. Kept in sync with bug-tracker's ROLE_LABELS.
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  lider: "Líder",
  qa: "QA",
  developer: "Developer",
  backend: "Backend",
  frontend: "Frontend",
};

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export type MemberStatus = "activo" | "pausado" | "retirado";

export const MEMBER_STATUSES: MemberStatus[] = ["activo", "pausado", "retirado"];

export const STATUS_LABELS: Record<MemberStatus, string> = {
  activo: "Activo",
  pausado: "Pausado",
  retirado: "Retirado",
};

export interface TeamMember {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  profile_id: string | null;
  age: number | null;
  career: string | null;
  last_job_role: string | null;
  linkedin_url: string | null;
  github_username: string | null;
  skills: string | null;
  favorite_area: string | null;
  area: string | null;
  position: string | null;
  collaboration_type: string | null;
  join_date: string | null;
  end_date: string | null;
  status: MemberStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingEntry {
  id: string;
  member_id: string;
  entry_date: string;
  note: string;
  created_by: string | null;
  created_at: string;
  author: Pick<Profile, "id" | "full_name" | "email"> | null;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
}

// Fixed vocabularies for the two free-text fields people kept phrasing
// differently ("Ing. Sistemas" vs "Ingeniería de Sistemas") — a combo box
// keeps names consistent everywhere they're shown (dashboard, /schedule
// detail, reports). Whoever's editing still sees their current value even
// if it isn't in the list (appended as an extra option), so switching to a
// combo box never silently discards existing data.
export const CAREER_OPTIONS = [
  "Ingeniería de Sistemas",
  "Ingeniería de Software",
  "Ingeniería Informática",
  "Ingeniería Industrial",
  "Ciencias de la Computación",
  "Administración y Marketing",
  "Administración de Empresas",
  "Diseño Gráfico",
  "Marketing Digital",
];

export const ROLE_OPTIONS = [
  "QA / Testing",
  "Backend Developer",
  "Frontend Developer",
  "Fullstack Developer",
  "Diseño UI/UX",
  "Marketing",
  "Data / IA",
  "Project Manager",
];

// Weekly recurring availability grid: day_of_week 0=Lunes .. 6=Domingo,
// hour = slot start (7..22, 1h blocks).
export const DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
export const HOURS: number[] = Array.from({ length: 16 }, (_, i) => i + 7);

export function slotKey(dayOfWeek: number, hour: number) {
  return `${dayOfWeek}-${hour}`;
}

export type AvailabilityStatus = "libre" | "tentativo" | "ocupado";

export const AVAILABILITY_STATUSES: AvailabilityStatus[] = ["libre", "tentativo", "ocupado"];

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  libre: "Libre",
  tentativo: "Probablemente ocupado",
  ocupado: "Ocupado",
};

export const AVAILABILITY_COLORS: Record<AvailabilityStatus, string> = {
  libre: "bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-500",
  tentativo: "bg-amber-300 hover:bg-amber-400 dark:bg-amber-500",
  ocupado: "bg-red-400 hover:bg-red-500 dark:bg-red-500",
};

// "day-hour:status" — the wire format AvailabilityGrid sends to the save
// action, since a plain string array is the simplest thing a client
// component can hand a server action without extra plumbing.
export function encodeSlot(dayOfWeek: number, hour: number, status: AvailabilityStatus) {
  return `${dayOfWeek}-${hour}:${status}`;
}

export function decodeSlot(
  slot: string,
): { day_of_week: number; hour: number; status: AvailabilityStatus } | null {
  const [dayHour, status] = slot.split(":");
  const [dayStr, hourStr] = (dayHour ?? "").split("-");
  const day_of_week = Number(dayStr);
  const hour = Number(hourStr);
  if (Number.isNaN(day_of_week) || Number.isNaN(hour)) return null;
  if (status !== "libre" && status !== "tentativo" && status !== "ocupado") return null;
  return { day_of_week, hour, status };
}
