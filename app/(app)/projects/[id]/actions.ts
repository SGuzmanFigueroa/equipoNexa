"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// Designating a leader is admin-only, same as in bug-tracker's Usuarios y
// roles (the canonical place to manage roles) — this just writes to the
// same shared profiles.role so it's one action, not a duplicate system.
export async function makeLeader(projectId: string, profileId: string) {
  await requireAdmin();
  const supabase = await createClient();

  // Guard: never silently demote an existing admin by clicking this.
  const { data: current } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .single();

  if (current?.role === "admin") {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent("Esa cuenta ya es admin — no se puede convertir en líder desde aquí.")}`,
    );
  }

  const { error } = await supabase.from("profiles").update({ role: "lider" }).eq("id", profileId);

  if (error) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/projects/${projectId}?success=${encodeURIComponent("Ahora es líder.")}`);
}
