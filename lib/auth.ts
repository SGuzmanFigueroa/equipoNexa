import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// cache(): the layout and the page share one auth check + one profiles
// query per request instead of repeating both round trips to Supabase.
// getClaims() verifies the JWT locally when the project uses asymmetric
// signing keys (falls back to a getUser() network call otherwise).
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", userId)
    .single();

  return profile as Profile | null;
});

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

// "Líder" is profiles.role = 'lider' — the same shared role bug-tracker
// assigns from its Usuarios y roles page, not a separate equipo-nexa-only
// flag. A leader can approve/edit team members almost like an admin, but
// identity/hire-date fields on an *existing* row stay locked for them at
// the DB level (enforce_self_editable_columns trigger), and only an admin
// can grant leadership, delete members, or touch another leader's role.
export async function requireAdminOrLeader(): Promise<{ profile: Profile; isAdmin: boolean }> {
  const profile = await requireProfile();
  if (profile.role === "admin") return { profile, isAdmin: true };
  if (profile.role === "lider") return { profile, isAdmin: false };
  redirect("/me");
}
