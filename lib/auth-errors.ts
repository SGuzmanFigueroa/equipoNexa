// Capa de presentación de los mensajes del login. Las server actions
// redirigen con un CÓDIGO (/login?error=email_not_confirmed) y la página lo
// traduce aquí; el error original de Supabase nunca se muestra.
// Compatibilidad: /login?error=Email%20not%20confirmed (texto de Supabase)
// también se reconoce.

export const AUTH_ERRORS = {
  email_not_confirmed: "Tu correo electrónico aún no ha sido confirmado.",
  invalid_credentials: "El correo o la contraseña son incorrectos.",
  user_already_exists: "Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.",
  weak_password: "La contraseña es muy débil. Usa al menos 6 caracteres, combinando letras y números.",
  email_address_invalid: "Ese correo no es válido. Revísalo e inténtalo de nuevo.",
  over_email_send_rate_limit: "Se enviaron demasiados correos en poco tiempo. Espera unos minutos y vuelve a intentarlo.",
  over_request_rate_limit: "Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.",
  signup_disabled: "El registro de cuentas nuevas está desactivado. Pide acceso a un administrador.",
  user_banned: "Tu cuenta está desactivada. Contacta a un administrador.",
  missing_fields: "Completa todos los campos para continuar.",
  missing_email: "Escribe tu correo para reenviarte la confirmación.",
  link_expired: "El enlace de confirmación ya no es válido o expiró. Pide uno nuevo abajo.",
  unknown: "No pudimos iniciar sesión. Inténtalo nuevamente.",
} as const;

export const AUTH_MESSAGES = {
  signup_pending:
    "¡Cuenta creada! Te enviamos un correo para confirmar tu cuenta. Ábrelo y haz clic en el enlace; después inicia sesión aquí.",
  email_confirmed: "¡Tu correo quedó confirmado! Ya puedes iniciar sesión.",
  confirmation_resent: "Te reenviamos el correo de confirmación. Revisa tu bandeja de entrada.",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;
export type AuthMessageCode = keyof typeof AUTH_MESSAGES;

// Códigos de Supabase con otro nombre para lo mismo.
const ALIASES: Record<string, AuthErrorCode> = {
  email_exists: "user_already_exists",
  validation_failed: "email_address_invalid",
};

const BY_TEXT: [RegExp, AuthErrorCode][] = [
  [/email not confirmed/i, "email_not_confirmed"],
  [/invalid login credentials/i, "invalid_credentials"],
  [/already registered|already exists/i, "user_already_exists"],
  [/password should be at least|weak password/i, "weak_password"],
  [/email rate limit/i, "over_email_send_rate_limit"],
  [/security purposes|after \d+ seconds|rate limit/i, "over_request_rate_limit"],
];

function isErrorCode(value: string): value is AuthErrorCode {
  return value in AUTH_ERRORS;
}

// Para las server actions: error de Supabase → código de la app.
export function authErrorCode(error: { code?: string; message: string }): AuthErrorCode {
  if (error.code) {
    if (isErrorCode(error.code)) return error.code;
    if (ALIASES[error.code]) return ALIASES[error.code];
  }
  return BY_TEXT.find(([re]) => re.test(error.message))?.[1] ?? "unknown";
}

// Para la página: valor del query param (código o texto viejo) → código.
export function parseAuthError(raw: string | undefined): AuthErrorCode | null {
  if (!raw) return null;
  if (isErrorCode(raw)) return raw;
  return BY_TEXT.find(([re]) => re.test(raw))?.[1] ?? "unknown";
}

export function parseAuthMessage(raw: string | undefined): AuthMessageCode | null {
  return raw && raw in AUTH_MESSAGES ? (raw as AuthMessageCode) : null;
}
