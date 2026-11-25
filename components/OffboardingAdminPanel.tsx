import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SubmitButton from "@/components/SubmitButton";
import { RECOMMENDS_LABELS, ratingLabel, type Offboarding } from "@/lib/offboarding";

// Panel de la ficha (solo admin): activar la salida del integrante y ver
// sus respuestas de la encuesta.

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function Answer({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">
        {value || <span className="text-slate-400">Sin respuesta</span>}
      </dd>
    </div>
  );
}

export default function OffboardingAdminPanel({
  memberName,
  hasLogin,
  offboarding,
  activateAction,
  deactivateAction,
}: {
  memberName: string;
  hasLogin: boolean;
  offboarding: Offboarding | null;
  activateAction: () => Promise<void>;
  deactivateAction: () => Promise<void>;
}) {
  const o = offboarding;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-nexa-navy dark:text-white">Salida y certificado</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {!o &&
              "Al activarla, cuando entre a su cuenta verá un agradecimiento, la encuesta de salida y la descarga de su certificado de participación."}
            {o && !o.submitted_at && `Activada el ${formatDateTime(o.activated_at)}. Esperando que responda la encuesta.`}
            {o?.submitted_at &&
              `Encuesta respondida el ${formatDateTime(o.submitted_at)}. ${
                o.certificate_downloaded_at
                  ? `Descargó su certificado el ${formatDateTime(o.certificate_downloaded_at)}.`
                  : "Aún no descarga su certificado."
              }`}
          </p>
          {!o && !hasLogin && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Este integrante no tiene una cuenta vinculada: no podrá ver la encuesta hasta que se vincule.
            </p>
          )}
        </div>

        {!o ? (
          <form action={activateAction}>
            <SubmitButton pendingLabel="Activando..." className="h-9 rounded-lg px-3 text-sm font-medium">
              Activar salida
            </SubmitButton>
          </form>
        ) : (
          <form action={deactivateAction}>
            <ConfirmSubmitButton
              confirmMessage={`¿Desactivar la salida de ${memberName}?${
                o.submitted_at ? " Se borrarán sus respuestas de la encuesta." : ""
              }`}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50"
            >
              Desactivar
            </ConfirmSubmitButton>
          </form>
        )}
      </div>

      {o?.submitted_at && (
        <dl className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-slate-700">
          <Answer
            label="Ambiente laboral"
            value={o.environment_rating ? `${o.environment_rating}/10 · ${ratingLabel(o.environment_rating)}` : null}
          />
          <Answer
            label="¿Recomendaría Nexa?"
            value={
              o.recommends
                ? `${RECOMMENDS_LABELS[o.recommends]}${o.recommend_reason ? ` — ${o.recommend_reason}` : ""}`
                : null
            }
          />
          <Answer label="Qué aprendió" value={o.learned} />
          <Answer label="Qué espera luego" value={o.expectations} />
          <Answer label="A dónde quiere llegar" value={o.career_goal} />
          <Answer label="Qué mejoraría" value={o.improvements} />
        </dl>
      )}
    </div>
  );
}
