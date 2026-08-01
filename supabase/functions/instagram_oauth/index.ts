// supabase/functions/instagram_oauth/index.ts
// Edge Function: Vinculación verificada de Instagram vía OAuth.
// Deploy: supabase functions deploy instagram_oauth --no-verify-jwt
// Secrets: IG_APP_ID, IG_APP_SECRET, IG_STATE_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const ME_URL = 'https://graph.instagram.com/v23.0/me?fields=user_id,username';
const DEEP_LINK_BASE = 'gmo://profile/edit';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos

function getRedirectUri(): string {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram_oauth/callback`;
}

// ---------- HMAC state ----------

async function getStateKey(): Promise<CryptoKey> {
  // Fail-fast: con secret vacío la firma HMAC sería forjable por cualquiera.
  const secret = Deno.env.get('IG_STATE_SECRET');
  if (!secret) throw new Error('IG_STATE_SECRET no configurado');
  const raw = new TextEncoder().encode(secret);
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function signState(uid: string): Promise<string> {
  const nonce = crypto.randomUUID();
  const payload = base64url(new TextEncoder().encode(JSON.stringify({ uid, exp: Date.now() + STATE_TTL_MS, nonce })));
  const key = await getStateKey();
  const sig = base64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  return `${payload}.${sig}`;
}

/** Verifica state timing-safe. Devuelve uid o null si inválido/expirado. */
async function verifyState(state: string): Promise<string | null> {
  const dotIdx = state.lastIndexOf('.');
  if (dotIdx < 0) return null;
  const payload = state.slice(0, dotIdx);
  const sigStr = state.slice(dotIdx + 1);

  const key = await getStateKey();
  const expectedSig = base64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));

  // Comparación timing-safe
  const a = new TextEncoder().encode(expectedSig);
  const b = new TextEncoder().encode(sigStr);
  if (a.length !== b.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) return null;

  // Verificar expiración
  try {
    const decoded = JSON.parse(new TextDecoder().decode(base64urlDecode(payload)));
    if (typeof decoded.exp !== 'number' || Date.now() > decoded.exp) return null;
    return decoded.uid as string;
  } catch {
    return null;
  }
}

// ---------- Helpers ----------

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors() },
  });
}

function redirect302(to: string) {
  return new Response(null, { status: 302, headers: { location: to } });
}

// ---------- Main ----------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });

  const url = new URL(req.url);
  const isCallback = url.pathname.endsWith('/callback');

  // ---- GET /callback ----
  if (req.method === 'GET' && isCallback) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') ?? '';
    const igError = url.searchParams.get('error');

    // Cualquier error de IG (access_denied u otro código) significa que no hay
    // code que intercambiar — tratamos todos como cancelación.
    if (igError) {
      return redirect302(`${DEEP_LINK_BASE}?ig_status=cancelled`);
    }

    // Validar state
    const uid = await verifyState(state).catch(() => null);
    if (!uid) {
      return redirect302(`${DEEP_LINK_BASE}?ig_status=error&reason=invalid_state`);
    }

    try {
      // Exchange code → access_token
      const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('IG_APP_ID') ?? '',
          client_secret: Deno.env.get('IG_APP_SECRET') ?? '',
          grant_type: 'authorization_code',
          redirect_uri: getRedirectUri(),
          code: code ?? '',
        }),
      });

      if (!tokenRes.ok) {
        console.error('IG token exchange failed', tokenRes.status, await tokenRes.text());
        return redirect302(`${DEEP_LINK_BASE}?ig_status=error&reason=exchange_failed`);
      }

      const { access_token } = await tokenRes.json() as { access_token: string };

      // Obtener user_id y username de IG
      const meRes = await fetch(`${ME_URL}&access_token=${access_token}`);
      if (!meRes.ok) {
        console.error('IG /me failed', meRes.status, await meRes.text());
        return redirect302(`${DEEP_LINK_BASE}?ig_status=error&reason=exchange_failed`);
      }

      const { user_id, username } = await meRes.json() as { user_id: string; username: string };

      // Actualizar perfil con service role (sin el token IG — solo verificamos ownership)
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          instagram_username: username,
          instagram_user_id: user_id,
          instagram_verified: true,
          instagram_linked_at: new Date().toISOString(),
        })
        .eq('id', uid);

      if (updateError) {
        // Violación unique: esa cuenta IG ya está vinculada a otro perfil
        if (updateError.code === '23505') {
          return redirect302(`${DEEP_LINK_BASE}?ig_status=error&reason=already_linked`);
        }
        console.error('IG profile update failed', updateError);
        return redirect302(`${DEEP_LINK_BASE}?ig_status=error&reason=exchange_failed`);
      }

      return redirect302(`${DEEP_LINK_BASE}?ig_status=success&ig_username=${encodeURIComponent(username)}`);
    } catch (e) {
      console.error('IG callback exception', e);
      return redirect302(`${DEEP_LINK_BASE}?ig_status=error&reason=exchange_failed`);
    }
  }

  // ---- POST / body { action: 'start' } ----
  if (req.method === 'POST') {
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return json({ error: 'unauthorized' }, 401);

    try {
      const { action } = (await req.json()) as { action: string };
      if (action !== 'start') return json({ error: 'unknown action' }, 400);

      const state = await signState(user.id);
      const appId = Deno.env.get('IG_APP_ID') ?? '';
      const redirectUri = getRedirectUri();

      const authorizeUrl =
        `${AUTHORIZE_URL}?client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=instagram_business_basic` +
        `&state=${encodeURIComponent(state)}`;

      return json({ authorizeUrl });
    } catch (e) {
      console.error('IG start exception', e);
      return json({ error: 'internal' }, 500);
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
