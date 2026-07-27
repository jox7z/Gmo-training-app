import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra?.supabaseUrl as string | undefined) ??
  '';
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined) ??
  '';

export const isSupabaseConfigured =
  !!url && !url.includes('YOUR-PROJECT') && !!anonKey && !anonKey.includes('YOUR-ANON');

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE es requerido por el flujo OAuth (src/lib/auth/oauth.ts): con el
    // default 'implicit' el redirect devuelve tokens en el fragment y
    // exchangeCodeForSession no aplica. No afecta login por email/password
    // (grant de contraseña) ni los deep links de reset/confirmación (que hoy
    // no intercambian código en la app).
    flowType: 'pkce',
  },
});

export async function callEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase no configurado: rellena .env o app.json extra.');
  }
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw error;
  return data as T;
}
