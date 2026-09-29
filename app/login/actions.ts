"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authErrorCode, authErrorMessage } from "@/lib/auth-errors";

function loginUrl(params: Record<string, string>) {
  return `/login?${new URLSearchParams(params).toString()}`;
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

  if (error) {
    const params: Record<string, string> = { error: authErrorMessage(error) };
    if (authErrorCode(error) === "email_not_confirmed") params.reason = "unconfirmed";
    redirect(loginUrl(params));
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!fullName || !email) {
    redirect(loginUrl({ error: "Ingresa tu nombre completo y tu correo." }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: await confirmRedirectUrl() },
  });

  if (error) {
    redirect(loginUrl({ error: authErrorMessage(error) }));
  }

  // Sin sesión = el proyecto exige confirmar el correo antes de entrar.
  if (!data.session) {
    redirect(
      loginUrl({
        message:
          "¡Cuenta creada! Te enviamos un correo para confirmar tu cuenta. Ábrelo y haz clic en el enlace (revisa también Spam o Promociones); después ya puedes iniciar sesión aquí.",
        reason: "unconfirmed",
      }),
    );
  }

  redirect("/dashboard");
}

export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect(loginUrl({ error: "Escribe tu correo para reenviarte la confirmación.", reason: "unconfirmed" }));

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: await confirmRedirectUrl() },
  });

  if (error) {
    redirect(loginUrl({ error: authErrorMessage(error), reason: "unconfirmed" }));
  }
  redirect(
    loginUrl({
      message: "Listo, te reenviamos el correo de confirmación. Revisa tu bandeja de entrada y también Spam.",
    }),
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
