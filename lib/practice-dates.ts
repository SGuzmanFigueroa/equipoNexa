// Cálculo de la fecha fin de prácticas a partir de la fecha de inicio.
// Se usa en el cliente (para mostrar la fecha al instante) y en el servidor
// (para recalcularla antes de guardar, así no se puede manipular).
//
// Todas las fechas se manejan como fechas de calendario "YYYY-MM-DD" y
// objetos Date locales creados con (año, mes, día): nunca se parsea con
// new Date("YYYY-MM-DD") (eso es UTC y en Perú correría la fecha un día).

export const PRACTICE_TOTAL_HOURS = 320;
export const PRACTICE_HOURS_PER_DAY = 6;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  // Rechaza fechas imposibles como 2026-02-31.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

// Domingo de Pascua (algoritmo anónimo gregoriano / Meeus-Jones-Butcher).
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Feriados nacionales oficiales del Perú (fijos, "MM-DD"). No incluye los
// "días no laborables" decretados solo para el sector público.
// Para agregar uno nuevo basta con sumarlo a esta lista.
const FIXED_HOLIDAYS: { date: string; name: string }[] = [
  { date: "01-01", name: "Año Nuevo" },
  { date: "05-01", name: "Día del Trabajo" },
  { date: "06-07", name: "Batalla de Arica y Día de la Bandera" },
  { date: "06-29", name: "San Pedro y San Pablo" },
  { date: "07-23", name: "Día de la Fuerza Aérea del Perú" },
  { date: "07-28", name: "Fiestas Patrias" },
  { date: "07-29", name: "Fiestas Patrias" },
  { date: "08-06", name: "Batalla de Junín" },
  { date: "08-30", name: "Santa Rosa de Lima" },
  { date: "10-08", name: "Combate de Angamos" },
  { date: "11-01", name: "Todos los Santos" },
  { date: "12-08", name: "Inmaculada Concepción" },
  { date: "12-09", name: "Batalla de Ayacucho" },
  { date: "12-25", name: "Navidad" },
];

// Feriados nacionales puntuales de un año concreto (por ley/decreto que
// declare FERIADO, no "día no laborable"), en formato "YYYY-MM-DD".
const ADDITIONAL_HOLIDAYS: { date: string; name: string }[] = [];

const holidayCache = new Map<number, Map<string, string>>();

// Feriados de un año: fijos + Jueves y Viernes Santo (móviles).
export function peruHolidays(year: number): Map<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const holidays = new Map<string, string>();
  for (const h of FIXED_HOLIDAYS) holidays.set(`${year}-${h.date}`, h.name);

  const easter = easterSunday(year);
  const holyThursday = new Date(year, easter.getMonth(), easter.getDate() - 3);
  const goodFriday = new Date(year, easter.getMonth(), easter.getDate() - 2);
  holidays.set(toISODate(holyThursday), "Jueves Santo");
  holidays.set(toISODate(goodFriday), "Viernes Santo");
  for (const h of ADDITIONAL_HOLIDAYS) {
    if (h.date.startsWith(`${year}-`)) holidays.set(h.date, h.name);
  }

  holidayCache.set(year, holidays);
  return holidays;
}

export function isPeruHoliday(date: Date): boolean {
  return peruHolidays(date.getFullYear()).has(toISODate(date));
}

// Lunes a viernes y que no sea feriado nacional.
export function isWorkingDay(date: Date): boolean {
  const day = date.getDay(); // 0 = domingo, 6 = sábado
  return day !== 0 && day !== 6 && !isPeruHoliday(date);
}

// Recorre los días calendario desde la fecha de inicio (inclusive) y
// acumula horas solo en días laborables hasta completar horasTotales.
// Devuelve la fecha (YYYY-MM-DD) del día en que se completan, o null si la
// fecha de inicio está vacía o no es válida.
// Ej.: 320 h a 6 h/día = 53 días completos + 2 h → fin = día laborable 54.
export function calcularFechaFin(
  fechaInicio: string | null | undefined,
  horasTotales = PRACTICE_TOTAL_HOURS,
  horasPorDia = PRACTICE_HOURS_PER_DAY,
): string | null {
  if (!fechaInicio) return null;
  const current = parseISODate(fechaInicio);
  if (!current || horasTotales <= 0 || horasPorDia <= 0) return null;

  let hours = 0;
  // Tope de seguridad: nunca debería acercarse a esto.
  for (let guard = 0; guard < 3660; guard++) {
    if (isWorkingDay(current)) {
      hours += Math.min(horasPorDia, horasTotales - hours);
      if (hours >= horasTotales) return toISODate(current);
    }
    current.setDate(current.getDate() + 1);
  }
  return null;
}
