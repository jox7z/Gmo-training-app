---
name: project-overview
description: Gmo Training App overview — React Native/Expo fitness app, frontend ~70-85% done, Supabase backend defined but not yet deployed
metadata:
  type: project
---

Gmo Training App is a React Native/Expo SDK 54 fitness app using expo-router, Zustand stores, TypeScript strict mode, and path alias `@/*`.

**Why:** Personal fitness tracker with social features. Frontend ~70-85% complete. Supabase backend schema is defined but not deployed.

**How to apply:** All feature work is currently client-side only. Do not touch Supabase/backend until explicitly asked. Focus on frontend + local AsyncStorage stores.

Key stores: `src/store/app.ts` (profile, auth state), `src/store/routines.ts` (routines list, activeRoutineId), `src/store/workouts.ts` (active workout, history). All three stores hydrate from AsyncStorage and are initialized in `app/_layout.tsx` startup effect.

Active workout flow (`app/workout/active.tsx`) uses a phase state machine: `'intro' | 'warmup' | 'set' | 'rest' | 'summary'`. `startWorkout()` is called at warmup-finish so `startedAt` reflects real work start.

Optimization scoring: `src/lib/optimizationScore.ts` has two score functions — `computeOptimizationScore` (workout history-based, used by coach) and `computeRoutineScore` (routine structure-based, used by routines tab). Do NOT mix them.
