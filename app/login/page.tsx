import SubmitButton from "@/components/SubmitButton";
import { resendConfirmation, signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; reason?: string }>;
}) {
  const { error, message, reason } = await searchParams;
  const unconfirmed = reason === "unconfirmed";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-nexa-navy via-nexa-blue to-nexa-sky px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white ring-1 ring-white/30">
            N
          </span>
          <h1 className="text-2xl font-semibold text-white">Equipo Nexa</h1>
          <p className="mt-1 text-sm text-blue-100/80">
            Gestión de integrantes de Nexa Consulting TI
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 shadow"
          >
            <span aria-hidden className="mt-px font-bold">!</span>
            <p>{error}</p>
          </div>
        )}
        {message && (
          <div
            role="status"
            className="flex gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 shadow"
          >
            <span aria-hidden className="mt-px font-bold">✓</span>
            <p>{message}</p>
          </div>
        )}
        {unconfirmed && (
          <form
            action={resendConfirmation}
            className="space-y-2 rounded-xl border border-white/20 bg-white/95 p-4 shadow-lg shadow-nexa-navy/10"
          >
            <p className="text-sm font-medium text-slate-700">¿No te llegó el correo de confirmación?</p>
            <div className="flex gap-2">
              <input
                name="email"
                type="email"
                required
                placeholder="Tu correo electrónico"
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
              />
              <SubmitButton
                variant="dark"
                pendingLabel="Enviando..."
                className="shrink-0 rounded-md px-3 py-2 text-sm font-medium"
              >
                Reenviar
              </SubmitButton>
            </div>
          </form>
        )}

        <form
          action={signIn}
          className="space-y-3 rounded-xl border border-white/20 bg-white p-5 shadow-xl shadow-nexa-navy/20"
        >
          <h2 className="text-sm font-medium text-slate-700">Iniciar sesión</h2>
          <input
            name="email"
            type="email"
            required
            placeholder="Correo electrónico"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Contraseña"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
          />
          <SubmitButton
            variant="primary"
            pendingLabel="Entrando..."
            className="w-full rounded-md px-3 py-2 text-sm font-medium"
          >
            Entrar
          </SubmitButton>
        </form>

        <details className="rounded-xl border border-white/20 bg-white/95 p-5 shadow-lg shadow-nexa-navy/10">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Crear cuenta nueva
          </summary>
          <form action={signUp} className="mt-3 space-y-3">
            <input
              name="full_name"
              type="text"
              required
              placeholder="Nombres y apellidos completos"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Correo electrónico"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
            />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Contraseña (mín. 6 caracteres)"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
            />
            <SubmitButton
              variant="dark"
              pendingLabel="Creando cuenta..."
              className="w-full rounded-md px-3 py-2 text-sm font-medium"
            >
              Registrarme
            </SubmitButton>
            <p className="text-xs text-slate-400">
              Esta cuenta comparte backend con el Bug Tracker de Nexa. Solo el rol{" "}
              <code>admin</code> en <code>profiles</code> puede entrar aquí.
            </p>
          </form>
        </details>
      </div>
    </div>
  );
}
