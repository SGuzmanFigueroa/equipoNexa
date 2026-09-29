// Traduce los errores de Postgres que el usuario sí puede corregir a un
// mensaje entendible; el resto se muestra tal cual.
export function friendlyDbError(error: { code?: string; message: string }) {
  if (error.code === "23505" && error.message.includes("team_members_dni_unique")) {
    return "Ese DNI ya está registrado en otro integrante.";
  }
  if (error.code === "23514" && error.message.includes("team_members_dni_format")) {
    return "El DNI debe tener exactamente 8 dígitos.";
  }
  return error.message;
}
