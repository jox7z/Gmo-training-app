import { Loader } from '@/components/ui/Loader';

// The redirect logic now lives in app/_layout.tsx (centralized so it works
// regardless of which route expo-router picks as the initial entry point).
// This file just renders a visible loader while the redirect happens.
export default function Index() {
  return <Loader />;
}
