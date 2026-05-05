import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/app';

export default function Index() {
  const onboarded = useAppStore((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
