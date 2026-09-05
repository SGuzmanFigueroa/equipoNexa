import { createMember } from "./actions";
import { MEMBER_STATUSES, STATUS_LABELS } from "@/lib/types";

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-nexa-navy">Nuevo integrante</h1>
      <p className="mb-6 text-sm text-slate-500">Registra a una persona del equipo de Nexa.</p>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form
        action={createMember}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
          <input
            name="full_name"
            required
            placeholder="Ej: María Fernández"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
            <input
              name="email"
              type="email"
              placeholder="correo@nexa.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              name="phone"
              placeholder="+51 9..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Área</label>
            <input
              name="area"
              placeholder="Ej: Ingeniería de Sistemas"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cargo</label>
            <input
              name="position"
              placeholder="Ej: Desarrollador Backend"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tipo de colaboración
            </label>
            <input
              name="collaboration_type"
              placeholder="Ej: Ad honorem"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Fecha de ingreso
            </label>
            <input
              name="join_date"
              type="date"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
            <select
              name="status"
              defaultValue="activo"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Cualquier detalle relevante (contexto de incorporación, condiciones, etc.)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-nexa-blue px-3 py-2 text-sm font-medium text-white shadow-sm shadow-nexa-blue/30 transition-colors hover:bg-nexa-navy"
        >
          Registrar integrante
        </button>
      </form>
    </div>
  );
}
