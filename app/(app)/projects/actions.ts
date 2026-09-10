"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createProject(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !code) {
    redirect(`/projects?error=${encodeURIComponent("Ponle nombre y un código corto (ej. MKT).")}`);
  }

  const { error } = await supabase.from("projects").insert({
    name,
    slug: slugify(name),
    code,
    description: description || null,
  });

  if (error) {
    redirect(`/projects?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/projects?success=${encodeURIComponent("Proyecto agregado.")}`);
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    redirect(`/projects?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/projects?success=${encodeURIComponent("Proyecto eliminado.")}`);
}
