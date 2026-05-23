import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import 'react-native-url-polyfill/auto';

import { colors } from '@/theme/tokens';
import { useAppStore } from '@/store/app';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getProfile } from '@/lib/repos/profile';

console.log('[RootLayout] module load. Supabase configured?', isSupabaseConfigured);
SplashScreen.preventAutoHideAsync().catch(() => {});
// Set the native root window background so Android doesn't flash/show white
// while React mounts or when a screen renders an empty state.
SystemUI.setBackgroundColorAsync(colors.bg.base).catch(() => {});

const AUTH_TIMEOUT_MS = 3000;

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
  const router = useRouter();
  const segments = useSegments();

  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured);
  const [hasSession, setHasSession] = useState(false);

  // 1. Hydrate AsyncStorage
  useEffect(() => {
    hydrate().finally(() => SplashScreen.hideAsync().catch(() => {}));
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
      .then(({ data: { session } }) => {
        if (cancelled) return;
        clearTimeout(timer);
        console.log('[RootLayout] getSession OK, hasSession =', !!session);
        setHasSession(!!session);
        setAuthChecked(true);
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
      if (event === 'SIGNED_OUT' || !session) return;
      try {
        const remote = await getProfile(session.user.id);
        if (remote) await setProfile(remote);
        else await hydrate();
      } catch {
        await hydrate().catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, [hydrate, setProfile]);

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

    // CASE 3: session but not onboarded → push to onboarding (unless already there)
    if (!onboarded) {
      if (!inOnboarding) {
        console.log('[RootLayout] → /onboarding');
        router.replace('/onboarding');
      }
      return;
    }

    // CASE 4: signed in + onboarded → must be in tabs.
    // Redirect from root "/" or any stray non-tab route.
    if (!inTabs) {
      console.log('[RootLayout] → /(tabs) (from', first ?? '(root)', ')');
      router.replace('/(tabs)');
    }
  }, [hydrated, authChecked, hasSession, onboarded, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
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
              name="auth/login"
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen name="auth/signup" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="auth/forgot-password" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="auth/check-email" options={{ animation: 'fade' }} />
            <Stack.Screen name="auth/reset-password" options={{ animation: 'fade' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
