"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export type OffboardingFormState = { ok: boolean; error?: string } | null;

// Encuesta de salida: la valida y guarda la función submit_offboarding
// (security definer, una sola vez por integrante).
export async function submitOffboarding(
  _prev: OffboardingFormState,
  formData: FormData,
): Promise<OffboardingFormState> {
  await requireProfile();
  const supabase = await createClient();

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const rating = Number(formData.get("environment_rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    return { ok: false, error: "Elige del 1 al 10 cómo sentiste el ambiente laboral." };
  }
  if (!text("learned") || !text("expectations") || !text("career_goal")) {
    return { ok: false, error: "Responde todas las preguntas obligatorias." };
  }
  const recommends = text("recommends");
  if (!["si", "tal_vez", "no"].includes(recommends)) {
    return { ok: false, error: "Cuéntanos si recomendarías Nexa Consulting TI." };
  }

  const { error } = await supabase.rpc("submit_offboarding", {
    p_environment_rating: rating,
    p_learned: text("learned"),
    p_expectations: text("expectations"),
    p_career_goal: text("career_goal"),
    p_recommends: recommends,
    p_recommend_reason: text("recommend_reason"),
    p_improvements: text("improvements"),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
