"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

// Piezas visuales compartidas por el login, el registro y el reenvío de
// confirmación. Solo presentación: los valores viajan en el form tal cual.

const INPUT =
  "h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 text-[15px] text-slate-800 shadow-[0_1px_2px_rgba(10,31,68,0.04)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-nexa-blue focus:ring-4 focus:ring-nexa-blue/15 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20";

const ICONS = {
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 1 8 7 8-7",
  lock: "M7 11V7a5 5 0 0 1 10 0v4M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
} as const;

export type IconName = keyof typeof ICONS;

function FieldIcon({ name }: { name: IconName }) {
  return (
    <svg
      className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {children}
    </label>
  );
}

export function TextField({
  id,
  label,
  icon,
  ...input
}: { id: string; label: string; icon: IconName } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <FieldIcon name={icon} />
        <input id={id} {...input} className={`${INPUT} pr-4`} />
      </div>
    </div>
  );
}

export function PasswordField({
  id,
  label,
  hint,
  ...input
}: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <FieldIcon name="lock" />
        <input id={id} type={visible ? "text" : "password"} {...input} className={`${INPUT} pr-12`} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexa-blue/40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {visible ? (
              <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.3 4.2M6.6 6.6A17 17 0 0 0 2.5 12S6 19 12 19a9.7 9.7 0 0 0 5.4-1.6" />
            ) : (
              <>
                <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

// Botón que sabe si SU formulario se está enviando (useFormStatus): se
// deshabilita para evitar doble envío y muestra el spinner.
export function AuthSubmit({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "primary"
      ? "h-12 w-full bg-nexa-blue text-[15px] font-semibold text-white shadow-sm shadow-nexa-blue/25 hover:bg-[#0f559f] dark:hover:bg-blue-600"
      : "h-11 bg-nexa-navy px-4 text-sm font-semibold text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nexa-blue/30 disabled:cursor-not-allowed disabled:opacity-75 ${styles}`}
    >
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}

export function AuthAlert({ variant, children }: { variant: "error" | "success"; children: React.ReactNode }) {
  const error = variant === "error";
  return (
    <div
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
      className={`auth-fade-in flex gap-3 rounded-xl border px-4 py-3 text-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
      }`}
    >
      <svg className="mt-0.5 h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        {error ? <path d="M12 7.5v5M12 16h.01" /> : <path d="m8.5 12 2.5 2.5 4.5-5" />}
      </svg>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
