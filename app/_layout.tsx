import { Stack, useRouter, useSegments } from 'expo-router';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import 'react-native-url-polyfill/auto';

import { colors } from '@/theme/tokens';
import { useAppStore } from '@/store/app';
import { useRoutinesStore } from '@/store/routines';
import { useWorkoutsStore } from '@/store/workouts';
import { useAchievementsStore } from '@/store/achievements';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getProfile } from '@/lib/repos/profile';
import { getWorkouts } from '@/lib/repos/workouts';
import { isProfileComplete } from '@/lib/auth';
import { useCustomExercises } from '@/lib/queries/exercises';
import { setCustomExerciseCache } from '@/data/exercises';
import { ToastProvider } from '@/components/ui/Toast';

SplashScreen.preventAutoHideAsync().catch(() => {});

// React Query focus tracking via AppState: refetch stale queries when
// the app comes back to foreground (replaces the web window-focus event).
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => sub.remove();
});
// React Query online tracking via NetInfo (patrón oficial RN): sin esto,
// onlineManager asume siempre online y refetchOnReconnect nunca dispara.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);
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
      // retry 0: bajo 'offlineFirst' el PRIMER intento siempre corre, pero un
      // REINTENTO exige onlineManager.isOnline() — sin red el retry queda en
      // 'paused' (ni loading ni error) y la pantalla cae en un falso vacío.
      // Con retry 0 el fallo llega directo a isError; la recuperación la cubren
      // refetchOnReconnect + refetchOnWindowFocus.
      retry: 0,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      // Con onlineManager cableado a NetInfo, el default 'online' dejaría las
      // queries sin caché en 'paused' cuando no hay red (spinner infinito, la
      // rama isError nunca corre). 'offlineFirst' deja correr el primer intento:
      // sin red falla rápido → las ramas isError/ErrorState funcionan, y al
      // reconectar refetchOnReconnect sí dispara (onlineManager ya emite).
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Mismo motivo: sin red la mutación corre y falla rápido en vez de quedar
      // en pausa; el error llega a onError/rollback óptimista.
      networkMode: 'offlineFirst',
    },
  },
});

// Mantiene el cache de módulo de ejercicios custom (data/exercises) sincronizado
// con React Query, para que exerciseById() los resuelva desde código no-React.
// Debe vivir DENTRO del QueryClientProvider (usa useQuery), por eso es un hijo
// del árbol de providers y no parte de RootLayout.
function CustomExerciseCacheSync() {
  const userId = useAppStore((s) => s.profile?.id);
  const { data } = useCustomExercises(userId);
  useEffect(() => {
    setCustomExerciseCache(data ?? []);
  }, [data]);
  return null;
}

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
    const achievementsHydrate = useAchievementsStore.getState().hydrate;
    Promise.all([hydrate(), routinesHydrate(), workoutsHydrate(), achievementsHydrate()])
      .then(() => {
        // Backfill silencioso una sola vez: registra los logros que ya
        // correspondían al historial existente sin celebrarlos. A partir de
        // aquí, cada workout nuevo sí dispara la celebración (incluido el
        // primer entreno de un usuario nuevo, que arranca sin historial).
        const ach = useAchievementsStore.getState();
        if (!ach.seeded) {
          ach.sync({
            history: useWorkoutsStore.getState().history,
          });
        }
      })
      .finally(() => SplashScreen.hideAsync().catch(() => {}));
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
      first === 'workout' ||
      first === 'routine' ||
      first === 'profile' ||
      first === 'publish' ||
      first === 'discover' ||
      first === 'events' ||
      first === 'notifications' ||
      first === 'body' ||
      first === 'achievements' ||
      first === 'records' ||
      first === 'communities';

    // Recovery flow: when the user opens the password reset deep link, Supabase
    // creates a temporary session. We MUST let them stay on reset-password and
    // NOT auto-redirect them to /(tabs).
    const inPasswordRecovery = inAuthGroup && (second === 'reset-password' || second === 'check-email');

    // CASE 1: no session → push to login (unless already navigating auth flow)
    if (isSupabaseConfigured && !hasSession) {
      if (!inAuthGroup) {
        router.replace('/auth/login');
      }
      return;
    }

    // CASE 2: session but in password recovery → respect it
    if (inPasswordRecovery) {
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
        return;
      }
      if (profileComplete === false) {
        if (!inOnboarding) {
          router.replace('/onboarding');
        }
        return;
      }
      // profileComplete===true → liberar; cae al CASE 4.
    } else {
      if (!onboarded) {
        if (!inOnboarding) {
          router.replace('/onboarding');
        }
        return;
      }
    }

    // CASE 4: signed in + onboarded → must be in tabs or an allowed authed route.
    // Redirect from root "/" or any stray unknown route.
    if (!inTabs && !inAllowedAuthedRoute) {
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
          <CustomExerciseCacheSync />
          <ToastProvider>
          {/* BottomSheetModalProvider va DENTRO de ToastProvider: este pinta su
              overlay después de children, así que los toasts quedan por encima
              de cualquier hoja inferior abierta. */}
          <BottomSheetModalProvider>
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
            <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="publish"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="discover" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="records" options={{ animation: 'slide_from_right' }} />
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
          </BottomSheetModalProvider>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
