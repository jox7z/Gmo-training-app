import { Stack, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { isProfileComplete } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/Toast';

console.log('[RootLayout] module load. Supabase configured?', isSupabaseConfigured);
SplashScreen.preventAutoHideAsync().catch(() => {});
// Set the native root window background so Android doesn't flash/show white
// while React mounts or when a screen renders an empty state.
SystemUI.setBackgroundColorAsync(colors.bg.base).catch(() => {});

const AUTH_TIMEOUT_MS = 3000;
const PROFILE_CHECK_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  const onboarded = useAppStore((s) => s.onboarded);
  const hydrate = useAppStore((s) => s.hydrate);
  const setProfile = useAppStore((s) => s.setProfile);
  const markOnboarded = useAppStore((s) => s.markOnboarded);
  const router = useRouter();
  const segments = useSegments();

  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured);
  const [hasSession, setHasSession] = useState(false);
  // Cache de is_profile_complete por sesión. null = aún no consultado.
  // Solo se recalcula en SIGNED_IN / cuando el perfil se actualiza, NO en
  // cada cambio de segmento (evita un RPC por navegación).
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

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
          try {
            const ok = await withTimeout(
              isProfileComplete(session.user.id),
              PROFILE_CHECK_TIMEOUT_MS,
              false,
            );
            if (!cancelled) {
              setProfileComplete(ok);
              if (ok) void markOnboarded();
            }
          } catch {
            if (!cancelled) setProfileComplete(false);
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
        setProfileComplete(null);
        return;
      }
      // Recalcula profileComplete en cada SIGNED_IN / USER_UPDATED / etc.
      // Es la única vía: no se llama por cada cambio de segmento.
      try {
        const ok = await withTimeout(
          isProfileComplete(session.user.id),
          PROFILE_CHECK_TIMEOUT_MS,
          false,
        );
        setProfileComplete(ok);
        if (ok) void markOnboarded();
      } catch {
        setProfileComplete(false);
      }
      try {
        const remote = await getProfile(session.user.id);
        if (remote) await setProfile(remote);
        else await hydrate();
      } catch {
        await hydrate().catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, [hydrate, setProfile, markOnboarded]);

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
      first === 'body';

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
    // Con Supabase configurado, el backend (profileComplete) es la
    // única verdad. Si todavía no contestó (null), ESPERA — no decidas.
    // Sin Supabase (modo offline/dev), respeta el flag local.
    if (isSupabaseConfigured) {
      if (profileComplete === null) {
        console.log('[RootLayout] waiting for is_profile_complete');
        return;
      }
      // profileComplete===false pero onboarded===true: el usuario acaba de
      // completar onboarding en esta sesión. completeSignup() ya actualizó
      // el backend pero no hubo SIGNED_IN event que re-corra isProfileComplete().
      // Confiamos en el flag local; la próxima sesión sincroniza el backend.
      if (profileComplete === false && !onboarded) {
        if (!inOnboarding) {
          console.log('[RootLayout] → /onboarding (profile incomplete)');
          router.replace('/onboarding');
        }
        return;
      }
      // profileComplete===true OR (false && onboarded===true) → liberar.
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
            <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="events/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen
              name="events/new"
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
