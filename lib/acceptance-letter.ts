// Carta de aceptación de prácticas preprofesionales: qué datos de
// team_members se usan, cómo se validan y cómo se arma el payload para el
// Apps Script. Lo usa solo el servidor (app/api/generar-carta); el
// navegador únicamente manda el id del integrante.
import { calcularFechaFin } from "@/lib/practice-dates";
import { formatDateDMY } from "@/lib/member-filters";
import { isValidDni, type TeamMember } from "@/lib/types";

export type LetterMember = Pick<
  TeamMember,
  "id" | "full_name" | "dni" | "career" | "university" | "join_date" | "end_date"
>;

export const LETTER_MEMBER_COLUMNS = "id, full_name, dni, career, university, join_date, end_date";

// Contrato con el Apps Script (doPost): mismos nombres de propiedad.
export interface LetterPayload {
  nombreCompleto: string;
  dni: string;
  carrera: string;
  universidad: string;
  fechaInicio: string; // DD/MM/AAAA
  fechaFin: string; // DD/MM/AAAA
}

// Lo que se muestra en el modal de confirmación.
export interface LetterPreview {
  memberId: string;
  nombreCompleto: string;
  dni: string | null;
  carrera: string | null;
  universidad: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  missing: string[];
}

function clean(value: string | null | undefined) {
  const v = (value ?? "").trim();
  // Nunca tratar marcadores de "vacío" como dato real.
  return v && v !== "—" && v.toLowerCase() !== "sin información" ? v : null;
}

// La fecha fin sale SIEMPRE de calcularFechaFin(join_date) (la misma regla
// de 320 h que usa el resto de la app), así la carta no depende de que
// end_date guardado esté sincronizado.
export function buildLetter(member: LetterMember): { preview: LetterPreview; payload: LetterPayload | null } {
  const nombre = clean(member.full_name);
  const dni = clean(member.dni);
  const carrera = clean(member.career);
  const universidad = clean(member.university);
  const inicio = clean(member.join_date);
  const fin = calcularFechaFin(inicio);

  const missing = [
    !nombre && "Nombre completo",
    !dni ? "DNI" : !isValidDni(dni) && "DNI válido (8 dígitos)",
    !carrera && "Carrera",
    !universidad && "Universidad",
    !inicio && "Fecha de inicio (ingreso)",
    inicio && !fin && "Fecha fin (no se pudo calcular)",
  ].filter((f): f is string => Boolean(f));

  const preview: LetterPreview = {
    memberId: member.id,
    nombreCompleto: nombre ?? "",
    dni,
    carrera,
    universidad,
    fechaInicio: formatDateDMY(inicio),
    fechaFin: formatDateDMY(fin),
    missing,
  };

  if (missing.length > 0) return { preview, payload: null };

  return {
    preview,
    payload: {
      nombreCompleto: nombre!,
      dni: dni!,
      carrera: carrera!.toLocaleUpperCase("es-PE"),
      universidad: universidad!.toLocaleUpperCase("es-PE"),
      fechaInicio: preview.fechaInicio!,
      fechaFin: preview.fechaFin!,
    },
  };
}
