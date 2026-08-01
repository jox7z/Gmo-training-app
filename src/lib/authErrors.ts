/**
 * Maps Supabase auth error messages/codes to user-friendly Spanish strings.
 * Add new mappings here as you discover them in production logs.
 */

interface MaybeAuthError {
  message?: string;
  code?: string;
  status?: number;
}

export function humanizeAuthError(err: unknown): string {
  if (!err) return 'Ha ocurrido un error inesperado.';

  const e = err as MaybeAuthError;
  const msg = (e.message ?? '').toLowerCase();
  const code = e.code ?? '';

  // Supabase v2 error codes
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos.';
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Aún no has confirmado tu email. Revisa tu bandeja de entrada.';
  }
  if (code === 'user_already_exists' || msg.includes('user already registered') || msg.includes('already registered')) {
    return 'Ya existe una cuenta con ese email. Inicia sesión o recupera tu contraseña.';
  }
  if (code === 'weak_password' || msg.includes('password should be at least')) {
    return 'La contraseña es demasiado débil. Cumple todos los requisitos.';
  }
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit')) {
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentar.';
  }
  if (code === 'invalid_email' || msg.includes('unable to validate email')) {
    return 'El formato del email no es válido.';
  }
  if (code === 'signup_disabled' || msg.includes('signups not allowed')) {
    return 'El registro está deshabilitado temporalmente.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.';
  }
  if (msg.includes('user not found')) {
    return 'No existe una cuenta con ese email.';
  }

  // Fallback to the original message if it looks human-readable, otherwise a generic.
  if (e.message && e.message.length < 150) return e.message;
  return 'Ha ocurrido un error. Inténtalo de nuevo.';
}
