import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/app';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function Index() {
  const onboarded = useAppStore((s) => s.onboarded);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setAuthReady(true);
    });
  }, []);

  if (!authReady) return null;
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (isSupabaseConfigured && !hasSession) return <Redirect href="/auth/login" />;
  return <Redirect href="/(tabs)" />;
}
