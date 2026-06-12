import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { callEdgeFunction } from '@/lib/supabase';

export type IgLinkResult =
  | { status: 'success'; username: string }
  | { status: 'cancelled' }
  // Android: el browser se abre/cierra sin entregar el redirect a la sesión;
  // el resultado real llega después por deep link (gmo://profile/edit?ig_status=...).
  | { status: 'pending' }
  | { status: 'error'; reason?: string };

/**
 * Inicia el flujo OAuth de Instagram:
 * 1. Llama a la edge function para obtener la URL de autorización.
 * 2. Abre el navegador del sistema con esa URL.
 * 3. Cuando el browser regresa al deep link gmo://profile/edit, parsea los params.
 *
 * Requiere que la edge function instagram_oauth esté desplegada con --no-verify-jwt
 * y que las credenciales Meta (IG_APP_ID, IG_APP_SECRET, IG_STATE_SECRET) estén
 * configuradas en Supabase secrets.
 */
export async function linkInstagram(): Promise<IgLinkResult> {
  const { authorizeUrl } = await callEdgeFunction<{ authorizeUrl: string }>(
    'instagram_oauth',
    { action: 'start' },
  );

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, 'gmo://profile/edit');

  // 'cancel' = el usuario cerró la sesión de auth (iOS) → cancelado de verdad.
  // 'opened'/'dismiss' (Android) no implican fallo: el deep link puede llegar
  // igualmente, así que no mostramos nada y dejamos que lo resuelva el listener.
  if (result.type === 'cancel') {
    return { status: 'cancelled' };
  }
  if (result.type !== 'success') {
    return { status: 'pending' };
  }

  const parsed = Linking.parse(result.url);
  const igStatus = parsed.queryParams?.ig_status as string | undefined;
  const igUsername = parsed.queryParams?.ig_username as string | undefined;
  const reason = parsed.queryParams?.reason as string | undefined;

  if (igStatus === 'success' && igUsername) {
    return { status: 'success', username: igUsername };
  }
  if (igStatus === 'cancelled') {
    return { status: 'cancelled' };
  }
  return { status: 'error', reason };
}
