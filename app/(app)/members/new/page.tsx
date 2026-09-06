import SubmitButton from "@/components/SubmitButton";
import { createMember } from "./actions";
import { MEMBER_STATUSES, STATUS_LABELS } from "@/lib/types";

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; full_name?: string; email?: string }>;
}) {
  const { error, full_name, email } = await searchParams;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-nexa-navy dark:text-white">
        Nuevo integrante
      </h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Registra a una persona del equipo de Nexa.
      </p>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {(full_name || email) && (
        <p className="mb-4 rounded-md bg-nexa-light p-3 text-sm text-nexa-blue dark:bg-blue-950/30 dark:text-blue-300">
          Datos precargados desde una cuenta ya registrada en el Gestor de Tickets — revisa y
          completa el resto.
        </p>
      )}

      <form
        action={createMember}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nombre completo
          </label>
          <input
            name="full_name"
            required
            defaultValue={full_name ?? ""}
            placeholder="Ej: María Fernández"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Correo
            </label>
            <input
              name="email"
              type="email"
              defaultValue={email ?? ""}
              placeholder="correo@nexa.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Teléfono</label>
            <input
              name="phone"
              placeholder="+51 9..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Área</label>
            <input
              name="area"
              placeholder="Ej: Ingeniería de Sistemas"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Cargo</label>
            <input
              name="position"
              placeholder="Ej: Desarrollador Backend"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tipo de colaboración
            </label>
            <input
              name="collaboration_type"
              placeholder="Ej: Ad honorem"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Fecha de ingreso
            </label>
            <input
              name="join_date"
              type="date"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
            <select
              name="status"
              defaultValue="activo"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {MEMBER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notas</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Cualquier detalle relevante (contexto de incorporación, condiciones, etc.)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <SubmitButton
          variant="primary"
          pendingLabel="Registrando..."
          className="w-full rounded-md px-3 py-2 text-sm font-medium"
        >
          Registrar integrante
        </SubmitButton>
      </form>
    </div>
  );
}
