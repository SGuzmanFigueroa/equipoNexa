// "Mejores momentos por proyecto": a partir de quién está asignado a cada
// proyecto y de su horario semanal, busca las franjas donde más integrantes
// están disponibles. Todo se calcula en memoria con los datos que ya carga
// /schedule, así que se actualiza solo cuando cambian asignaciones u horarios.
import { DAY_LABELS, HOURS, slotKey, type AvailabilityStatus } from "@/lib/types";

export type BestRange = {
  day: number;
  startHour: number;
  endHour: number; // exclusivo
  libre: number;
  tentativo: number;
};

export type NotConfirmed = { id: string; name: string; reason: "tentativo" | "ocupado" | "sinMarcar" | "sinHorario" };

// Franjas consecutivas del mismo día con el mismo conteo se juntan en un
// rango ("Martes 09:00–12:00"). Orden: más disponibles, luego más "tal vez",
// luego rangos más largos.
export function bestRangesFor(
  memberIds: string[],
  byMemberSlot: Map<string, Map<string, AvailabilityStatus>>,
  limit = 3,
): BestRange[] {
  const ranges: BestRange[] = [];
  for (let day = 0; day < DAY_LABELS.length; day++) {
    let current: BestRange | null = null;
    for (const hour of HOURS) {
      let libre = 0;
      let tentativo = 0;
      for (const id of memberIds) {
        const s = byMemberSlot.get(id)?.get(slotKey(day, hour));
        if (s === "libre") libre++;
        else if (s === "tentativo") tentativo++;
      }
      if (libre === 0) {
        current = null;
        continue;
      }
      if (current && current.libre === libre && current.tentativo === tentativo && current.endHour === hour) {
        current.endHour = hour + 1;
      } else {
        current = { day, startHour: hour, endHour: hour + 1, libre, tentativo };
        ranges.push(current);
      }
    }
  }
  ranges.sort(
    (a, b) =>
      b.libre - a.libre ||
      b.tentativo - a.tentativo ||
      b.endHour - b.startHour - (a.endHour - a.startHour) ||
      a.day - b.day ||
      a.startHour - b.startHour,
  );
  return ranges.slice(0, limit);
}

// Quiénes no están confirmados en un rango (se mira su peor hora dentro del
// rango), para saber a quién coordinar.
export function notConfirmedIn(
  range: BestRange,
  members: { id: string; name: string; hasSchedule: boolean }[],
  byMemberSlot: Map<string, Map<string, AvailabilityStatus>>,
): NotConfirmed[] {
  const rank = { libre: 0, tentativo: 1, sinMarcar: 2, ocupado: 3 } as const;
  const out: NotConfirmed[] = [];
  for (const m of members) {
    if (!m.hasSchedule) {
      out.push({ id: m.id, name: m.name, reason: "sinHorario" });
      continue;
    }
    let worst: keyof typeof rank = "libre";
    for (let h = range.startHour; h < range.endHour; h++) {
      const s = byMemberSlot.get(m.id)?.get(slotKey(range.day, h));
      const cat: keyof typeof rank = s === "libre" ? "libre" : s === "tentativo" ? "tentativo" : s === "ocupado" ? "ocupado" : "sinMarcar";
      if (rank[cat] > rank[worst]) worst = cat;
    }
    if (worst !== "libre") out.push({ id: m.id, name: m.name, reason: worst });
  }
  return out;
}

export function formatRange(r: Pick<BestRange, "startHour" | "endHour">) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(r.startHour)}:00 – ${pad(r.endHour)}:00`;
}
