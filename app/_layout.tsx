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
import {
  LOCAL_USER_ID,
  normalizeSecondaryGoals,
  useAppStore,
  type UserProfile,
} from '@/store/app';
import { useRoutinesStore } from '@/store/routines';
import { useWorkoutsStore } from '@/store/workouts';
import { useAchievementsStore } from '@/store/achievements';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getProfile, updateProfileGoals } from '@/lib/repos/profile';
import { getWorkouts } from '@/lib/repos/workouts';
import { isProfileComplete } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';

console.log('[RootLayout] module load. Supabase configured?', isSupabaseConfigured);
SplashScreen.preventAutoHideAsync().catch(() => {});

// React Query focus tracking via AppState: refetch stale queries when
// the app comes back to foreground (replaces the web window-focus event).
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state) => {
    const isActive = state === 'active';
    if (isActive) useAppStore.getState().refreshWeeklyProgress();
    handleFocus(isActive);
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

async function reconcilePendingSecondaryGoals(
  remote: UserProfile,
): Promise<UserProfile> {
  const local = useAppStore.getState().profile;
  if (
    !local?.secondaryGoalsSyncPending ||
    local.id !== remote.id ||
    local.secondaryGoals.length === 0 ||
    remote.secondaryGoals.length > 0
  ) {
    return remote;
  }

  const pendingGoals = normalizeSecondaryGoals(remote.goal, local.secondaryGoals);
  if (pendingGoals.length === 0) return remote;

  const pendingProfile: UserProfile = {
    ...remote,
    secondaryGoals: pendingGoals,
    secondaryGoalsSyncPending: true,
  };
  try {
    const result = await withTimeout(
      updateProfileGoals(remote.id, remote.goal, pendingGoals),
      PROFILE_CHECK_TIMEOUT_MS,
      { secondaryGoalsPersisted: false },
    );
    return {
      ...pendingProfile,
      secondaryGoalsSyncPending: !result.secondaryGoalsPersisted,
    };
  } catch {
    return pendingProfile;
  }
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
  const workoutHistory = useWorkoutsStore((s) => s.history);
  const weeklyGoalDays = useAppStore((s) => s.profile?.weeklyGoalDays);
  // profileComplete viene del store (estado de sesión, no persiste).
  // El backend es la única verdad: no depende del flag local `onboarded`.
  const profileComplete = useAppStore((s) => s.profileComplete);
  const router = useRouter();
  const segments = useSegments();

  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured);
  const [hasSession, setHasSession] = useState(false);
  const [storesHydrated, setStoresHydrated] = useState(false);

  // 1. Hydrate AsyncStorage (app + routines + workouts — local stores, not gated behind auth)
  useEffect(() => {
    const routinesHydrate = useRoutinesStore.getState().hydrate;
    const workoutsHydrate = useWorkoutsStore.getState().hydrate;
    const achievementsHydrate = useAchievementsStore.getState().hydrate;
    Promise.all([hydrate(), routinesHydrate(), workoutsHydrate(), achievementsHydrate()])
      .finally(() => {
        setStoresHydrated(true);
        SplashScreen.hideAsync().catch(() => {});
      });
  }, [hydrate]);

  // La racha y los logros se recalculan ante hidratación, cambios del objetivo
  // y actualizaciones posteriores del historial local o remoto.
  useEffect(() => {
    if (!storesHydrated) return;
    useAppStore.getState().refreshWeeklyProgress();
    useAchievementsStore.getState().sync({ history: workoutHistory, weeklyGoalDays });
  }, [storesHydrated, weeklyGoalDays, workoutHistory]);

  // 2. Ruta única para sesión inicial + eventos auth. Suscribirse antes de
  // getSession permite que INITIAL_SESSION rescate la sesión cacheada si la
  // lectura explícita cuelga/falla. Cola serializa reconciliaciones y cada
  // snapshot nuevo invalida respuestas anteriores antes de escribir.
  useEffect(() => {
    if (!isSupabaseConfigured || !storesHydrated) return;
    type AuthSession =
      Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

    let cancelled = false;
    let latestGeneration = 0;
    let authQueue = Promise.resolve();
    let initialTimer: ReturnType<typeof setTimeout>;
    let authEventSeen = false;
    let initialNullFinalized = false;
    const initialSettledSources = new Set<'getSession' | 'INITIAL_SESSION'>();
    const initialValidFingerprints = new Set<string>();

    const isCurrent = (generation: number) =>
      !cancelled && generation === latestGeneration;

    const syncWorkouts = (userId: string, generation: number) => {
      queryClient.invalidateQueries({ queryKey: ['feed', 'list'] });
      getWorkouts(userId)
        .then((workouts) => {
          if (!isCurrent(generation)) return;
          useWorkoutsStore.getState().mergeHistory(workouts);
          useAppStore.getState().refreshWeeklyProgress();
        })
        .catch(() => {});
    };

    const processAuthSnapshot = async (
      event: string,
      session: AuthSession,
      generation: number,
      localResetCompleted: boolean,
    ) => {
      if (!isCurrent(generation)) return;
      console.log('[RootLayout] auth snapshot:', event, 'session?', !!session);
      setHasSession(!!session);
      setAuthChecked(true);

      if (!session) {
        if (!localResetCompleted) {
          await useAppStore.getState().resetLocalData();
        }
        if (!isCurrent(generation)) return;
        queryClient.clear();
        return;
      }

      const localOwnerId = useAppStore.getState().profile?.id;
      if (
        localOwnerId &&
        localOwnerId !== LOCAL_USER_ID &&
        localOwnerId !== session.user.id
      ) {
        await useAppStore.getState().resetLocalData();
        if (!isCurrent(generation)) return;
        queryClient.clear();
      }

      let remote: Awaited<ReturnType<typeof getProfileBounded>> = null;
      let fetchFailed = false;
      try {
        remote = await getProfileBounded(session.user.id);
      } catch {
        fetchFailed = true;
      }
      if (!isCurrent(generation)) return;
      if (remote === FETCH_TIMED_OUT) {
        fetchFailed = true;
        remote = null;
      }

      if (fetchFailed) {
        useAppStore.getState().setProfileComplete(
          useAppStore.getState().onboarded,
        );
        return;
      }

      if (!remote) {
        console.warn('[RootLayout] auth snapshot: perfil no existe → signOut');
        await useAppStore.getState().signOut();
        if (!isCurrent(generation)) return;
        setHasSession(false);
        useAppStore.getState().setProfileComplete(null);
        return;
      }

      const reconciledProfile = await reconcilePendingSecondaryGoals(remote);
      if (!isCurrent(generation)) return;
      await useAppStore.getState().setProfile(reconciledProfile);
      if (!isCurrent(generation)) return;

      try {
        const localOnboarded = useAppStore.getState().onboarded;
        const complete = await withTimeout(
          isProfileComplete(session.user.id),
          PROFILE_CHECK_TIMEOUT_MS,
          localOnboarded,
        );
        if (!isCurrent(generation)) return;
        useAppStore.getState().setProfileComplete(complete);
        if (complete) void useAppStore.getState().markOnboarded();
      } catch {
        if (!isCurrent(generation)) return;
        useAppStore.getState().setProfileComplete(
          useAppStore.getState().onboarded,
        );
      }

      syncWorkouts(session.user.id, generation);
    };

    const enqueueSnapshot = (event: string, session: AuthSession) => {
      const localOwnerId = useAppStore.getState().profile?.id;
      const crossesOwner =
        !!session &&
        !!localOwnerId &&
        localOwnerId !== LOCAL_USER_ID &&
        localOwnerId !== session.user.id;
      const mustResetLocal = !session || crossesOwner;
      const localReset = mustResetLocal
        ? useAppStore.getState().resetLocalData()
        : null;
      if (mustResetLocal) {
        setHasSession(false);
        if (crossesOwner) setAuthChecked(false);
        useAppStore.getState().setProfileComplete(null);
        queryClient.clear();
      }

      const generation = ++latestGeneration;
      authQueue = authQueue
        .catch(() => {})
        .then(async () => {
          if (localReset) await localReset;
          if (!isCurrent(generation)) return;
          await processAuthSnapshot(
            event,
            session,
            generation,
            mustResetLocal,
          );
        })
        .catch((error) => {
          if (!isCurrent(generation)) return;
          console.warn(
            '[RootLayout] auth snapshot ERROR:',
            error?.message ?? error,
          );
          setAuthChecked(true);
        });
    };

    const enqueueInitialSnapshot = (
      source: 'getSession' | 'INITIAL_SESSION',
      session: AuthSession,
    ) => {
      if (authEventSeen) return;
      initialSettledSources.add(source);
      if (session) {
        const fingerprint = `${session.user.id}:${session.access_token}`;
        if (initialValidFingerprints.has(fingerprint)) return;
        initialValidFingerprints.add(fingerprint);
        clearTimeout(initialTimer);
        enqueueSnapshot(source, session);
        return;
      }
      if (
        initialValidFingerprints.size > 0 ||
        initialNullFinalized ||
        initialSettledSources.size < 2
      ) return;
      initialNullFinalized = true;
      clearTimeout(initialTimer);
      enqueueSnapshot(source, null);
    };

    initialTimer = setTimeout(() => {
      if (
        !cancelled &&
        !authEventSeen &&
        !initialNullFinalized &&
        initialValidFingerprints.size === 0
      ) {
        console.warn('[RootLayout] initial auth TIMED OUT — assuming no session');
        setHasSession(false);
        setAuthChecked(true);
      }
    }, AUTH_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setTimeout(() => {
          if (cancelled) return;
          if (event === 'INITIAL_SESSION') {
            enqueueInitialSnapshot('INITIAL_SESSION', session);
            return;
          }
          authEventSeen = true;
          clearTimeout(initialTimer);
          enqueueSnapshot(event, session);
        }, 0);
      },
    );

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (cancelled) return;
        if (error) throw error;
        enqueueInitialSnapshot('getSession', session);
      })
      .catch((error) => {
        if (cancelled) return;
        initialSettledSources.add('getSession');
        if (
          !authEventSeen &&
          !initialNullFinalized &&
          initialValidFingerprints.size === 0 &&
          initialSettledSources.size === 2
        ) {
          initialNullFinalized = true;
          clearTimeout(initialTimer);
          enqueueSnapshot('getSession-error', null);
        }
        console.warn(
          '[RootLayout] getSession ERROR; waiting INITIAL_SESSION:',
          error?.message ?? error,
        );
      });

    return () => {
      cancelled = true;
      latestGeneration += 1;
      clearTimeout(initialTimer);
      subscription.unsubscribe();
    };
  }, [storesHydrated]);

  // 3. Centralized redirect logic — runs whenever ready state OR location changes.
  // This is the ONLY place that decides where the user should be.
  useEffect(() => {
    if (!storesHydrated || !hydrated || !authChecked) return;

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
      first === 'exercise' ||
      first === 'routine' ||
      first === 'profile' ||
      first === 'publish' ||
      first === 'discover' ||
      first === 'events' ||
      first === 'notifications' ||
      first === 'body' ||
      first === 'achievements' ||
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
  }, [
    storesHydrated,
    hydrated,
    authChecked,
    hasSession,
    onboarded,
    profileComplete,
    segments,
    router,
  ]);

  const ready = storesHydrated && hydrated && authChecked;

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
          <ConfirmProvider>
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
            <Stack.Screen name="exercise/[id]" options={{ animation: 'slide_from_right' }} />
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
          </ConfirmProvider>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
