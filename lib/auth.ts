import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/me");
  return profile;
}

// "Líder" is an equipo-nexa-only permission tier (team_members.is_leader),
// separate from bug-tracker's shared profiles.role — a leader can approve/
// edit team members almost like an admin, but identity/hire-date fields on
// an *existing* row stay locked for them at the DB level (enforce_self_editable_columns
// trigger), and only an admin can grant/revoke leadership or delete members.
export async function requireAdminOrLeader(): Promise<{ profile: Profile; isAdmin: boolean }> {
  const profile = await requireProfile();
  if (profile.role === "admin") return { profile, isAdmin: true };

  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("is_leader", true)
    .maybeSingle();

  if (!data) redirect("/me");
  return { profile, isAdmin: false };
}
