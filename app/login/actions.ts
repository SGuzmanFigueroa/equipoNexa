"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authErrorCode, type AuthErrorCode, type AuthMessageCode } from "@/lib/auth-errors";

// Solo se pasan CÓDIGOS por la URL; la página los traduce (lib/auth-errors).
function toLogin(params: { error?: AuthErrorCode; message?: AuthMessageCode; mode?: "register" }): never {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  redirect(`/login${qs ? `?${qs}` : ""}`);
}

// Después de confirmar el correo, Supabase manda aquí (debe estar en la
// lista "Redirect URLs" de Supabase; si no, usa la Site URL del proyecto).
async function confirmRedirectUrl() {
  const origin = (await headers()).get("origin");
  return origin ? `${origin}/auth/callback` : undefined;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) toLogin({ error: authErrorCode(error) });

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!fullName || !email) toLogin({ error: "missing_fields", mode: "register" });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: await confirmRedirectUrl() },
  });

  if (error) toLogin({ error: authErrorCode(error), mode: "register" });

  // Sin sesión = el proyecto exige confirmar el correo antes de entrar.
  if (!data.session) toLogin({ message: "signup_pending" });

  redirect("/dashboard");
}

export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) toLogin({ error: "missing_email" });

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: await confirmRedirectUrl() },
  });

  if (error) toLogin({ error: authErrorCode(error) });
  toLogin({ message: "confirmation_resent" });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
