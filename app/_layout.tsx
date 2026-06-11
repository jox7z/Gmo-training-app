import { Stack, useRouter, useSegments } from 'expo-router';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import 'react-native-url-polyfill/auto';

import { colors } from '@/theme/tokens';
import { useAppStore } from '@/store/app';
import { useRoutinesStore } from '@/store/routines';
import { useWorkoutsStore } from '@/store/workouts';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getProfile } from '@/lib/repos/profile';
import { getWorkouts } from '@/lib/repos/workouts';
import { isProfileComplete } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/Toast';

console.log('[RootLayout] module load. Supabase configured?', isSupabaseConfigured);
SplashScreen.preventAutoHideAsync().catch(() => {});

// React Query focus tracking via AppState: refetch stale queries when
// the app comes back to foreground (replaces the web window-focus event).
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => sub.remove();
});
// Set the native root window background so Android doesn't flash/show white
// while React mounts or when a screen renders an empty state.
SystemUI.setBackgroundColorAsync(colors.bg.base).catch(() => {});

const AUTH_TIMEOUT_MS = 3000;
const PROFILE_CHECK_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

// Sentinela para distinguir "getProfile hizo timeout" de sus resultados reales
// (UserProfile | null). null significa "el perfil NO existe" → signOut, así que
// un timeout jamás debe colapsar a null.
const FETCH_TIMED_OUT = '__fetch_timed_out__' as const;

// getProfile con cota de tiempo. Un cuelgue de red aquí (token refresh en frío,
// Android sin conexión) dejaba profileComplete en null para siempre y la app
// se quedaba en el Loader infinito al arrancar con sesión cacheada.
function getProfileBounded(userId: string) {
  return withTimeout<Awaited<ReturnType<typeof getProfile>> | typeof FETCH_TIMED_OUT>(
    getProfile(userId),
    PROFILE_CHECK_TIMEOUT_MS,
    FETCH_TIMED_OUT,
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
});

export default function RootLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  const onboarded = useAppStore((s) => s.onboarded);
  const hydrate = useAppStore((s) => s.hydrate);
  const setProfile = useAppStore((s) => s.setProfile);
  const markOnboarded = useAppStore((s) => s.markOnboarded);
  // profileComplete viene del store (estado de sesión, no persiste).
  // El backend es la única verdad: no depende del flag local `onboarded`.
  const profileComplete = useAppStore((s) => s.profileComplete);
  const router = useRouter();
  const segments = useSegments();

  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured);
  const [hasSession, setHasSession] = useState(false);

  // 1. Hydrate AsyncStorage (app + routines + workouts — local stores, not gated behind auth)
  useEffect(() => {
    const routinesHydrate = useRoutinesStore.getState().hydrate;
    const workoutsHydrate = useWorkoutsStore.getState().hydrate;
    Promise.all([hydrate(), routinesHydrate(), workoutsHydrate()]).finally(() =>
      SplashScreen.hideAsync().catch(() => {}),
    );
  }, [hydrate]);

  // 2. Check initial Supabase session (with safety timeout for Android)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        console.warn('[RootLayout] getSession TIMED OUT — assuming no session');
        setAuthChecked(true);
      }
    }, AUTH_TIMEOUT_MS);
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        clearTimeout(timer);
        console.log('[RootLayout] getSession OK, hasSession =', !!session);
        setHasSession(!!session);
        // Mark auth checked NOW so the 3-second guard doesn't need to cover
        // the isProfileComplete RPC — that call gets its own timeout below.
        setAuthChecked(true);
        if (session) {
          queryClient.invalidateQueries({ queryKey: ['feed', 'list'] });
          // Fire-and-forget: la descarga del historial NO debe bloquear el gate
          // de navegación (sin timeout, un cuelgue aquí congelaba el arranque).
          getWorkouts(session.user.id)
            .then((ws) => useWorkoutsStore.getState().mergeHistory(ws))
            .catch(() => {});

          // El servidor es la única verdad: si no hay fila de profile, la sesión
          // es fantasma (cuenta huérfana, borrada manualmente, etc.) → cerrar sesión.
          // Pero distinguimos "no existe" de un error de red transitorio: ante
          // un fallo de red NO expulsamos (no dejar sin app a alguien con mala
          // conexión); solo cerramos sesión cuando el perfil realmente no existe.
          let remote: Awaited<ReturnType<typeof getProfileBounded>> = null;
          let fetchFailed = false;
          try {
            remote = await getProfileBounded(session.user.id);
          } catch {
            fetchFailed = true;
          }
          // Timeout = no pudimos confirmar con el servidor → tratar como fallo
          // de red (fallback local), nunca como "perfil no existe".
          if (remote === FETCH_TIMED_OUT) {
            fetchFailed = true;
            remote = null;
          }

          if (fetchFailed) {
            // No se pudo confirmar con el servidor (red): caemos al flag local
            // `onboarded` para dar resiliencia offline a usuarios YA existentes.
            // Esto NO reintroduce el bug de cuentas nuevas: esas sí alcanzan el
            // servidor y reciben false vía getProfile/isProfileComplete; el gate
            // (CASE 3) ya no depende de `onboarded`.
            if (!cancelled) useAppStore.getState().setProfileComplete(useAppStore.getState().onboarded);
            return;
          }

          if (!remote) {
            if (!cancelled) {
              console.warn('[RootLayout] getSession: perfil no existe → signOut');
              await useAppStore.getState().signOut();
              setHasSession(false);
              useAppStore.getState().setProfileComplete(null);
            }
            return;
          }

          // Sincronizar perfil remoto al store.
          await setProfile(remote);

          // Consultar si el onboarding está completo. Si la RPC hace timeout o
          // falla (no podemos confirmar con el servidor) caemos al flag local
          // `onboarded`. La verdad del servidor (cuando responde) manda: una
          // cuenta nueva recibe false y va a /onboarding.
          try {
            const localOnboarded = useAppStore.getState().onboarded;
            const ok = await withTimeout(
              isProfileComplete(session.user.id),
              PROFILE_CHECK_TIMEOUT_MS,
              localOnboarded,
            );
            if (!cancelled) {
              useAppStore.getState().setProfileComplete(ok);
              if (ok) void markOnboarded();
            }
          } catch {
            if (!cancelled) useAppStore.getState().setProfileComplete(useAppStore.getState().onboarded);
          }
        }
      })
      .catch((e) => {
        if (cancelled) return;
        clearTimeout(timer);
        console.warn('[RootLayout] getSession ERROR:', e?.message ?? e);
        setAuthChecked(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // 3. Auth state subscription (login/logout in flight)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[RootLayout] auth event:', event, 'session?', !!session);
      setHasSession(!!session);
      setAuthChecked(true);
      if (event === 'SIGNED_OUT' || !session) {
        // Reset el cache para el próximo login (otra cuenta puede tener
        // distinto estado de profile completion).
        useAppStore.getState().setProfileComplete(null);
        return;
      }
      // Recalcula profileComplete en cada SIGNED_IN / USER_UPDATED / etc.
      // El servidor es la única verdad: si no hay fila de profile → signOut.
      // Distinguimos "no existe" de error de red transitorio (no expulsar).
      let remote: Awaited<ReturnType<typeof getProfileBounded>> = null;
      let fetchFailed = false;
      try {
        remote = await getProfileBounded(session.user.id);
      } catch {
        fetchFailed = true;
      }
      if (remote === FETCH_TIMED_OUT) {
        fetchFailed = true;
        remote = null;
      }

      if (fetchFailed) {
        // No se pudo confirmar con el servidor (red): caer al flag local.
        useAppStore.getState().setProfileComplete(useAppStore.getState().onboarded);
        return;
      }

      if (!remote) {
        console.warn('[RootLayout] onAuthStateChange: perfil no existe → signOut');
        await useAppStore.getState().signOut();
        return;
      }

      await setProfile(remote);

      // La verdad del servidor manda; si la RPC hace timeout/falla caemos al
      // flag local `onboarded` (resiliencia offline para usuarios existentes).
      try {
        const localOnboarded = useAppStore.getState().onboarded;
        const ok = await withTimeout(
          isProfileComplete(session.user.id),
          PROFILE_CHECK_TIMEOUT_MS,
          localOnboarded,
        );
        useAppStore.getState().setProfileComplete(ok);
        if (ok) void markOnboarded();
      } catch {
        useAppStore.getState().setProfileComplete(useAppStore.getState().onboarded);
      }
      queryClient.invalidateQueries({ queryKey: ['feed', 'list'] });
      getWorkouts(session.user.id)
        .then((ws) => useWorkoutsStore.getState().mergeHistory(ws))
        .catch(() => {});
    });
    return () => subscription.unsubscribe();
  }, [setProfile, markOnboarded]);

  // 4. Centralized redirect logic — runs whenever ready state OR location changes.
  // This is the ONLY place that decides where the user should be.
  useEffect(() => {
    if (!hydrated || !authChecked) return;

    const segs = segments as string[];
    const first = segs[0];
    const second = segs[1];

    const inAuthGroup = first === 'auth';
    const inOnboarding = first === 'onboarding';
    const inTabs = first === '(tabs)';
    // Authenticated routes that legitimately live outside the (tabs) group
    // (modals, full-screen flows, profile sub-pages). These must NOT be
    // bounced back to /(tabs) by the catch-all below.
    const inAllowedAuthedRoute =
      first === 'coach' ||
      first === 'workout' ||
      first === 'routine' ||
      first === 'profile' ||
      first === 'publish' ||
      first === 'discover' ||
      first === 'events' ||
      first === 'notifications' ||
      first === 'body' ||
      first === 'communities';

    // Recovery flow: when the user opens the password reset deep link, Supabase
    // creates a temporary session. We MUST let them stay on reset-password and
    // NOT auto-redirect them to /(tabs).
    const inPasswordRecovery = inAuthGroup && (second === 'reset-password' || second === 'check-email');

    console.log('[RootLayout] redirect check:', {
      hydrated, authChecked, hasSession, onboarded,
      currentSegment: first ?? '(root)',
      sub: second,
    });

    // CASE 1: no session → push to login (unless already navigating auth flow)
    if (isSupabaseConfigured && !hasSession) {
      if (!inAuthGroup) {
        console.log('[RootLayout] → /auth/login (no session)');
        router.replace('/auth/login');
      }
      return;
    }

    // CASE 2: session but in password recovery → respect it
    if (inPasswordRecovery) {
      console.log('[RootLayout] in recovery flow, leaving user alone');
      return;
    }

    // CASE 3: decidir si el usuario necesita onboarding.
    // Con Supabase configurado, el backend (profileComplete) es la ÚNICA verdad.
    // NO se usa el flag local `onboarded` — evita el bug donde AsyncStorage
    // guardó onboarded=true de una cuenta anterior y saltea el onboarding.
    // Si todavía no contestó (null), ESPERA — no decidas.
    // Sin Supabase (modo offline/dev), respeta el flag local.
    if (isSupabaseConfigured) {
      if (profileComplete === null) {
        console.log('[RootLayout] waiting for is_profile_complete');
        return;
      }
      if (profileComplete === false) {
        if (!inOnboarding) {
          console.log('[RootLayout] → /onboarding (profile incomplete)');
          router.replace('/onboarding');
        }
        return;
      }
      // profileComplete===true → liberar; cae al CASE 4.
    } else {
      if (!onboarded) {
        if (!inOnboarding) {
          console.log('[RootLayout] → /onboarding (offline mode)');
          router.replace('/onboarding');
        }
        return;
      }
    }

    // CASE 4: signed in + onboarded → must be in tabs or an allowed authed route.
    // Redirect from root "/" or any stray unknown route.
    if (!inTabs && !inAllowedAuthedRoute) {
      console.log('[RootLayout] → /(tabs) (from', first ?? '(root)', ')');
      router.replace('/(tabs)');
    }
  }, [hydrated, authChecked, hasSession, onboarded, profileComplete, segments, router]);

  const ready = hydrated && authChecked;

  // Render a neutral background while we resolve hydration + initial auth.
  // This prevents authenticated screens from mounting (and subscribing to
  // stores) before we know whether the user is signed in. Avoids the
  // "rendered fewer hooks" class of bug during sign-out.
  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg.base }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: colors.bg.base }} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg.base },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="workout/active"
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="routine/[id]"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="routine/templates"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="coach"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="profile/settings"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="profile/edit"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="profile/connections"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="body/new"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="auth/login"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen name="auth/signup" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="auth/forgot-password" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="auth/check-email" options={{ animation: 'fade' }} />
            <Stack.Screen name="auth/reset-password" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="publish"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="discover" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="communities/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen
              name="communities/new"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="communities/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen
              name="communities/edit/[id]"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="events/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen
              name="events/new"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="events/edit/[id]"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="profile/[username]"
              options={{ animation: 'slide_from_right' }}
            />
          </Stack>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
