export type UserRole = "admin" | "qa" | "developer" | "backend" | "frontend";

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
