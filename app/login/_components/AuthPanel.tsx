"use client";

import { useEffect, useState } from "react";
import { resendConfirmation, signIn, signUp } from "../actions";
import { AUTH_ERRORS, AUTH_MESSAGES, type AuthErrorCode, type AuthMessageCode } from "@/lib/auth-errors";
import { AuthAlert, AuthSubmit, PasswordField, TextField } from "./AuthFields";

// Tarjeta de acceso: iniciar sesión y crear cuenta en la misma página (como
// antes), con las mismas server actions de siempre.
export default function AuthPanel({
  error,
  message,
  initialMode,
}: {
  error: AuthErrorCode | null;
  message: AuthMessageCode | null;
  initialMode: "login" | "register";
}) {
  const [mode, setMode] = useState(initialMode);
  // El aviso se muestra solo en la vista donde ocurrió.
  const [notice, setNotice] = useState({ error, message });

  // Limpia ?error / ?message de la URL sin recargar, para que un refresh no
  // repita el aviso.
  useEffect(() => {
    if (window.location.search) window.history.replaceState(window.history.state, "", "/login");
  }, []);

  const switchTo = (next: "login" | "register") => {
    setMode(next);
    setNotice({ error: null, message: null });
  };

  const needsConfirmation =
    notice.error === "email_not_confirmed" || notice.error === "link_expired" || notice.message === "signup_pending";

  return (
    <div className="w-full max-w-[440px]">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(10,31,68,0.06),0_12px_32px_-12px_rgba(10,31,68,0.12)] sm:p-8 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30">
        <div key={mode} className="auth-fade-in">
          <h1 className="text-2xl font-bold tracking-tight text-nexa-navy sm:text-[26px] dark:text-white">
            {mode === "login" ? "Bienvenido a Equipo Nexa" : "Crea tu cuenta"}
          </h1>
          <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">
            {mode === "login"
              ? "Ingresa con tu cuenta para continuar."
              : "Usa el mismo correo con el que te registraron en Nexa."}
          </p>

          {(notice.error || notice.message) && (
            <div className="mt-6 space-y-3">
              {notice.error && (
                <AuthAlert variant="error">
                  <p className="font-medium">{AUTH_ERRORS[notice.error]}</p>
                  {notice.error === "email_not_confirmed" && (
                    <p className="mt-0.5 text-red-700/90 dark:text-red-300/90">
                      Abre el correo de confirmación que te enviamos (revisa también Spam o Promociones).
                    </p>
                  )}
                </AuthAlert>
              )}
              {notice.message && (
                <AuthAlert variant="success">
                  <p>{AUTH_MESSAGES[notice.message]}</p>
                </AuthAlert>
              )}
            </div>
          )}

          {mode === "login" ? (
            <form action={signIn} className="mt-6 space-y-5">
              <TextField
                id="login-email"
                name="email"
                type="email"
                label="Correo electrónico"
                icon="mail"
                autoComplete="email"
                inputMode="email"
                required
                placeholder="correo@ejemplo.com"
              />
              <PasswordField
                id="login-password"
                name="password"
                label="Contraseña"
                autoComplete="current-password"
                required
                placeholder="Tu contraseña"
              />
              <AuthSubmit pendingLabel="Iniciando sesión...">Iniciar sesión</AuthSubmit>
            </form>
          ) : (
            <form action={signUp} className="mt-6 space-y-5">
              <TextField
                id="register-name"
                name="full_name"
                label="Nombres y apellidos completos"
                icon="user"
                autoComplete="name"
                required
                placeholder="Ej: María Fernanda López Díaz"
              />
              <TextField
                id="register-email"
                name="email"
                type="email"
                label="Correo electrónico"
                icon="mail"
                autoComplete="email"
                inputMode="email"
                required
                placeholder="correo@ejemplo.com"
              />
              <PasswordField
                id="register-password"
                name="password"
                label="Contraseña"
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                hint="Usa al menos 6 caracteres."
              />
              <AuthSubmit pendingLabel="Creando cuenta...">Crear cuenta</AuthSubmit>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {mode === "login" ? "¿Aún no tienes una cuenta?" : "¿Ya tienes una cuenta?"}{" "}
            <button
              type="button"
              onClick={() => switchTo(mode === "login" ? "register" : "login")}
              className="rounded font-semibold text-nexa-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-blue/40 dark:text-blue-400"
            >
              {mode === "login" ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          </p>
        </div>
      </div>

      {needsConfirmation && (
        <form
          action={resendConfirmation}
          className="auth-fade-in mt-4 rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
        >
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reenviar correo de confirmación</p>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
            Escribe tu correo y te enviaremos un nuevo enlace.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <TextField
                id="resend-email"
                name="email"
                type="email"
                label="Correo para reenviar la confirmación"
                icon="mail"
                autoComplete="email"
                required
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="sm:self-end">
              <AuthSubmit variant="secondary" pendingLabel="Enviando...">
                Reenviar
              </AuthSubmit>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
