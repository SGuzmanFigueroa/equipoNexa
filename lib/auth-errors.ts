// Mensajes de Supabase Auth traducidos a algo que un integrante entienda.
// Se usa el código del error (estable) y, si no viene, el texto.
const MESSAGES: Record<string, string> = {
  email_not_confirmed:
    "Todavía no confirmas tu correo. Abre el correo de confirmación que te enviamos (revisa también Spam o Promociones) y luego vuelve a iniciar sesión.",
  invalid_credentials: "Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.",
  user_already_exists: "Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.",
  email_exists: "Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.",
  weak_password: "La contraseña es muy débil. Usa al menos 6 caracteres, combinando letras y números.",
  email_address_invalid: "Ese correo no es válido. Revísalo e inténtalo de nuevo.",
  validation_failed: "Revisa que el correo y la contraseña estén bien escritos.",
  over_email_send_rate_limit:
    "Se enviaron demasiados correos en poco tiempo. Espera unos minutos y vuelve a intentarlo.",
  over_request_rate_limit: "Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.",
  signup_disabled: "El registro de cuentas nuevas está desactivado. Pide acceso a un administrador.",
  user_banned: "Tu cuenta está desactivada. Contacta a un administrador.",
};

const BY_TEXT: [RegExp, string][] = [
  [/email not confirmed/i, "email_not_confirmed"],
  [/invalid login credentials/i, "invalid_credentials"],
  [/already registered|already exists/i, "user_already_exists"],
  [/password should be at least/i, "weak_password"],
  [/rate limit/i, "over_email_send_rate_limit"],
  [/security purposes|after \d+ seconds/i, "over_request_rate_limit"],
];

export function authErrorCode(error: { code?: string; message: string }) {
  if (error.code && MESSAGES[error.code]) return error.code;
  return BY_TEXT.find(([re]) => re.test(error.message))?.[1] ?? null;
}

export function authErrorMessage(error: { code?: string; message: string }) {
  const code = authErrorCode(error);
  return code ? MESSAGES[code] : "No pudimos completar la solicitud. Inténtalo nuevamente en unos minutos.";
}
