---
name: project-overview
description: Gmo Training App overview — React Native/Expo fitness app, frontend ~70-85% done, Supabase backend defined but not yet deployed
metadata:
  type: project
---

Gmo Training App is a React Native/Expo SDK 54 fitness app using expo-router, Zustand stores, TypeScript strict mode, and path alias `@/*`.

**Why:** Personal fitness tracker with social features. Frontend ~70-85% complete. Supabase backend deployed (env real, RPCs ok, migración 0017 aplicada — 0018 pendiente de aplicar).

**How to apply:** Backend is live. Apply migrations via Supabase dashboard SQL editor or CLI. Last applied migration: 0017_notifications.sql. Next pending: 0018_body_measurement_one_per_day.sql.

body_measurements table: added `measured_on date` column (unique per user+day), upsert-based insert, RPC body_timeline recreated to return one row per day ascending. WeightChart component positions points by real date (not index). WeightDetailModal provides extended chart view with period filter and stats.

Key stores: `src/store/app.ts` (profile, auth state), `src/store/routines.ts` (routines list, activeRoutineId), `src/store/workouts.ts` (active workout, history). All three stores hydrate from AsyncStorage and are initialized in `app/_layout.tsx` startup effect.

Active workout flow (`app/workout/active.tsx`) uses a phase state machine: `'intro' | 'warmup' | 'set' | 'rest' | 'summary'`. `startWorkout()` is called at warmup-finish so `startedAt` reflects real work start.

Optimization scoring: `src/lib/optimizationScore.ts` has two score functions — `computeOptimizationScore` (workout history-based, used by coach) and `computeRoutineScore` (routine structure-based, used by routines tab). Do NOT mix them.
