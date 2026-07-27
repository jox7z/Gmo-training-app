import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getRandomValues as expoGetRandomValues } from 'expo-crypto';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { humanizeAuthError } from '@/lib/authErrors';
import { AuthError } from '@/lib/auth';

/**
 * OAuth (Google / Apple) vía navegador — flujo web-based con PKCE.
 *
 * No usamos SDKs nativos (expo-apple-authentication / google-signin) porque
 * requieren development build. Este es OAuth real contra
 * `auth.users`/`auth.identities` de Supabase, con un salto de navegador.
 *
 * El cliente Supabase usa `flowType: 'pkce'` + `detectSessionInUrl: false`
 * (ver src/lib/supabase.ts), así que el intercambio código→sesión es manual:
 * capturamos el redirect con `openAuthSessionAsync` y llamamos
 * `exchangeCodeForSession`. La navegación post-login la maneja
 * `onAuthStateChange` en app/_layout.tsx (agnóstico del provider).
 */

// Requerido en target web: sin esto el popup de OAuth no se autocierra y la
// promesa de `openAuthSessionAsync` nunca resuelve. En nativo es no-op.
WebBrowser.maybeCompleteAuthSession();

// supabase-js genera el verifier PKCE con `crypto.getRandomValues`; Hermes no
// trae `crypto` global, así que sin este polyfill caería a un verifier basado
// en Math.random (menos seguro). Rellenamos SOLO lo que falte, nunca clobber.
const cryptoGlobal = globalThis as { crypto?: { getRandomValues?: unknown } };
if (typeof cryptoGlobal.crypto === 'undefined') {
  cryptoGlobal.crypto = { getRandomValues: expoGetRandomValues };
} else if (typeof cryptoGlobal.crypto.getRandomValues !== 'function') {
  cryptoGlobal.crypto.getRandomValues = expoGetRandomValues;
}

export type OAuthProvider = 'google' | 'apple';

/**
 * Mensaje único para cualquier fallo del provider OAuth. Sus códigos
 * (`server_error`, `temporarily_unavailable`, `invalid_request`…) llegan crudos
 * en query params y en inglés: no pasan por `humanizeAuthError` (esa tabla es
 * para objetos GoTrueError de email/password, otra forma) ni sirven al usuario.
 */
export const OAUTH_GENERIC_ERROR = 'No se pudo completar el inicio de sesión. Inténtalo de nuevo.';

/** `access_denied` = el usuario rechazó el consentimiento; no es un fallo. */
export const OAUTH_CANCELLED_MESSAGE = 'Cancelaste el inicio de sesión con el proveedor.';

const EXPO_GO_MESSAGE =
  'El login con Google/Apple requiere una versión de desarrollo de la app (no funciona en Expo Go). Usa un development build para probarlo.';

/**
 * Lanza el flujo OAuth para el provider dado. No retorna sesión: en éxito, el
 * listener `onAuthStateChange` de _layout.tsx recibe SIGNED_IN y navega. Lanza
 * `AuthError` (mismo patrón que signIn/signUp) en fallo para que el caller lo
 * muestre. Cancelar/cerrar el navegador NO es error.
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new AuthError('UNKNOWN', 'Supabase no configurado');
  }

  // Expo Go no soporta de forma fiable el redirect a un scheme propio:
  // `Linking.createURL` devuelve `exp://<ip-lan>:<puerto>/--/…` con IP dinámica,
  // que el matching de `additional_redirect_urls` de Supabase no resuelve bien
  // ni con wildcards. Sin este corte el navegador se abriría, el redirect sería
  // rechazado y lo veríamos como una cancelación del usuario: fallo mudo.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new AuthError('UNKNOWN', EXPO_GO_MESSAGE);
  }

  // En Android `gmo://` no es un scheme exclusivo (no hay App Links verificados):
  // otra app podría declarar el mismo intent-filter y capturar el redirect. El
  // robo de sesión lo corta PKCE — el `code_verifier` vive sólo en el
  // AsyncStorage sandboxed de esta app, así que un `code` interceptado no es
  // canjeable sin él.
  const redirectTo = Linking.createURL('/auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error || !data?.url) {
    throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  // cancel / dismiss / locked: el usuario cerró el navegador, no es un error.
  if (result.type !== 'success') return;

  const { queryParams } = Linking.parse(result.url);

  const errorCode = typeof queryParams?.error === 'string' ? queryParams.error : null;
  const errorDescription =
    typeof queryParams?.error_description === 'string' ? queryParams.error_description : null;

  if (errorCode || errorDescription) {
    // Rechazar el consentimiento equivale a cerrar el navegador: cancel silencioso.
    if (errorCode === 'access_denied') return;
    throw new AuthError('UNKNOWN', OAUTH_GENERIC_ERROR, errorDescription ?? errorCode);
  }

  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  if (!code) {
    throw new AuthError('UNKNOWN', OAUTH_GENERIC_ERROR);
  }

  await exchangeOAuthCode(code);
}

/**
 * Canjea el `code` de autorización por sesión. Extraído para que la pantalla de
 * respaldo `app/auth/callback.tsx` (el redirect que llega al router en vez de
 * ser interceptado por el navegador) no tenga que tocar el cliente Supabase.
 */
export async function exchangeOAuthCode(code: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new AuthError('UNKNOWN', 'Supabase no configurado');
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
  }
}
