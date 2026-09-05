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
  area: string | null;
  position: string | null;
  collaboration_type: string | null;
  join_date: string;
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
