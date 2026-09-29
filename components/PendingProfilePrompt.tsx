"use client";

import { useActionState, useEffect, useLayoutEffect, useState } from "react";
import Modal from "@/components/Modal";
import SubmitButton from "@/components/SubmitButton";
import { useToast } from "@/components/Toast";
import { completePendingProfile, type PendingProfileState } from "@/app/(app)/me/actions";
import { CAREER_OPTIONS, DNI_INPUT_PROPS, REQUIRED_PROFILE_LABELS, ROLE_OPTIONS, type RequiredProfileField } from "@/lib/types";
import { calcularFechaFin } from "@/lib/practice-dates";

// "Más tarde" solo esconde la ventana durante esta sesión del navegador; el
// banner sigue visible hasta que el integrante complete sus datos.
const DISMISS_KEY = "equipo-nexa:perfil-pendiente:cerrado";

const INPUT =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]";
const LABEL = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";
const HINT = "mt-1 text-xs text-slate-400";

function Field({ field }: { field: RequiredProfileField }) {
  const [joinDate, setJoinDate] = useState("");
  const label = (
    <label htmlFor={`pending-${field}`} className={LABEL}>
      {field === "linkedin_url" || field === "dni"
        ? REQUIRED_PROFILE_LABELS[field]
        : REQUIRED_PROFILE_LABELS[field].charAt(0).toUpperCase() + REQUIRED_PROFILE_LABELS[field].slice(1)}{" "}
      <span className="text-red-500">*</span>
    </label>
  );

  switch (field) {
    case "full_name":
      return (
        <div>
          {label}
          <input id="pending-full_name" name="full_name" required placeholder="Ej: María Fernanda López Díaz" className={INPUT} />
          <p className={HINT}>Nombres y apellidos completos.</p>
        </div>
      );
    case "dni":
      return (
        <div>
          {label}
          <input id="pending-dni" name="dni" required {...DNI_INPUT_PROPS} className={INPUT} />
          <p className={HINT}>Solo números. Revísalo bien: después solo un admin puede cambiarlo.</p>
        </div>
      );
    case "phone":
      return (
        <div>
          {label}
          <input id="pending-phone" name="phone" type="tel" required placeholder="Ej: +51 987 654 321" className={INPUT} />
          <p className={HINT}>Con código de país.</p>
        </div>
      );
    case "career":
      return (
        <div>
          {label}
          <select id="pending-career" name="career" required defaultValue="" className={INPUT}>
            <option value="" disabled>
              Elige tu carrera
            </option>
            {CAREER_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className={HINT}>Tu carrera universitaria (no el área ni el cargo en Nexa).</p>
        </div>
      );
    case "university":
      return (
        <div>
          {label}
          <input
            id="pending-university"
            name="university"
            required
            placeholder="Ej: Universidad Privada del Norte"
            className={INPUT}
          />
          <p className={HINT}>Nombre completo de tu universidad, sin abreviar.</p>
        </div>
      );
    case "position":
      return (
        <div>
          {label}
          <select id="pending-position" name="position" required defaultValue="" className={INPUT}>
            <option value="" disabled>
              Elige el rol que te asignaron
            </option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <p className={HINT}>El puesto que cumples en el equipo.</p>
        </div>
      );
    case "linkedin_url":
      return (
        <div>
          {label}
          <input
            id="pending-linkedin_url"
            name="linkedin_url"
            type="url"
            required
            placeholder="https://www.linkedin.com/in/tu-usuario"
            className={INPUT}
          />
          <p className={HINT}>Copia el link de tu perfil de LinkedIn.</p>
        </div>
      );
    case "skills":
      return (
        <div>
          {label}
          <input
            id="pending-skills"
            name="skills"
            required
            placeholder="Ej: Python, SQL, Figma, Selenium"
            className={INPUT}
          />
          <p className={HINT}>Herramientas y tecnologías que manejas, separadas por comas.</p>
        </div>
      );
    case "area":
      return (
        <div>
          {label}
          <input id="pending-area" name="area" required placeholder="Ej: QA, Desarrollo, Marketing" className={INPUT} />
          <p className={HINT}>El equipo o área de Nexa en el que estás.</p>
        </div>
      );
    case "join_date": {
      const end = calcularFechaFin(joinDate);
      return (
        <div>
          {label}
          <input
            id="pending-join_date"
            name="join_date"
            type="date"
            required
            value={joinDate}
            onChange={(e) => setJoinDate(e.target.value)}
            className={INPUT}
          />
          <p className={HINT}>
            El día en que empezaste en Nexa.
            {end && ` Tus prácticas terminarían el ${end.split("-").reverse().join("/")}.`}
          </p>
        </div>
      );
    }
  }
}

export default function PendingProfilePrompt({ missing }: { missing: RequiredProfileField[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<PendingProfileState, FormData>(completePendingProfile, null);
  const { push } = useToast();

  // Se abre sola al entrar, salvo que ya la haya cerrado en esta sesión.
  useLayoutEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee sessionStorage (externo) una vez al montar
    if (!dismissed) setOpen(true);
  }, []);

  useEffect(() => {
    if (state?.ok) {
      push("¡Gracias! Tus datos quedaron completos.", "success");
      try {
        window.sessionStorage.removeItem(DISMISS_KEY);
      } catch {}
    }
  }, [state, push]);

  const later = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setOpen(false);
  };

  if (state?.ok) return null;

  const labels = missing.map((k) => REQUIRED_PROFILE_LABELS[k]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p>
          <span className="font-semibold">Tienes datos pendientes por completar.</span> Te falta:{" "}
          {labels.join(", ")}.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-9 shrink-0 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition-colors hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          Completar ahora
        </button>
      </div>

      <Modal open={open} onClose={later} title="Datos pendientes" size="md">
        <form action={formAction} className="space-y-4">
          <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Tienes datos pendientes por completar.</p>
            <p>Rellénalos ahora, por favor. Todos son obligatorios.</p>
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {state.error}
            </p>
          )}

          {missing.map((field) => (
            <Field key={field} field={field} />
          ))}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={later}
              className="h-10 rounded-lg px-4 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Más tarde
            </button>
            <SubmitButton pendingLabel="Guardando..." className="h-10 rounded-lg px-5 text-sm font-medium">
              Guardar mis datos
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
