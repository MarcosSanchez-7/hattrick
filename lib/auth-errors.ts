/**
 * Traduce los mensajes de error de Supabase Auth (GoTrue) a texto en
 * español, claro para el cliente. No hereda de DataError (lib/data.ts):
 * son dominios distintos — uno son reglas de negocio del catálogo, este
 * traduce respuestas de un servicio externo.
 */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (m.includes("email not confirmed")) {
    return "Tu correo todavía no está verificado. Revisá tu bandeja de entrada.";
  }
  if (m.includes("password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (m.includes("rate limit")) {
    return "Demasiados intentos. Esperá un minuto y volvé a intentar.";
  }
  if (m.includes("user already registered")) {
    return "Ese correo ya tiene una cuenta. Iniciá sesión o restablecé tu contraseña.";
  }
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "Ese correo no es válido.";
  }

  return "No se pudo completar la operación. Intentá de nuevo.";
}
