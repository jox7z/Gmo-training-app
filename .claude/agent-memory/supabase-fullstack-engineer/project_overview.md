---
name: project-overview
description: Gmo Training App overview — React Native/Expo fitness app, frontend ~70-85% done, Supabase backend deployed (migración 0035 aplicada)
metadata:
  type: project
---

Gmo Training App is a React Native/Expo SDK 54 fitness app using expo-router, Zustand stores, TypeScript strict mode, and path alias `@/*`.

**Why:** Personal fitness tracker with social features. Frontend ~70-85% complete. Supabase backend deployed.

Last applied migrations through 0035. Plan jazzy-shimmying-fairy Fases 2+3 completadas:
- 0034_event_management: update_event/delete_event RPCs; bucket covers + RLS policies
- 0035_event_comments_scores: event_comments table; list/add/delete_event_comment RPCs; recompute_event_scores; trigger trg_workout_event_score; join_event actualizado con backfill
- Columnas workouts usadas para score: user_id, started_at, ended_at
- REVOKE EXECUTE FROM anon en todas las nuevas RPCs; trigger function revocada de anon+authenticated

Migration note that was pending: 0025_drop_volume_metric.sql (drops recompute_workout_volume trigger/function; replaces recalc_weekly_ranks() to omit total_volume_kg writes; column stays in DB as inert default 0).

**totalVolumeKg removed** from Workout type, all stores, DB insert payload, mapping, UI (Summary, publish, profile, settings, coach), Heatmap (now uses totalReps), optimizationScore.scoreProgression (now uses totalReps). exerciseTopWeight exported from workoutCompare.ts.

New components: TimeSeriesChart (SVG primitivo), ExerciseProgressModal (exercise selector chips, Peso/Reps toggle, period filter, stats, session list). WeightChart refactored to consume TimeSeriesChart.

New lib: src/lib/exerciseProgress.ts (buildExerciseTimeline, listTrainedExercises).

AppStore: pinnedExerciseId added to AppState + persist() + setPinnedExercise setter.

Progress tab: ExerciseProgressCard section after TimelineCard, before BodySection.

Keyboard fix in active.tsx LogPhase: KeyboardAvoidingView (iOS padding), InputAccessoryView "Listo" button, returnKeyType="done", blurOnSubmit, onSubmitEditing=Keyboard.dismiss on BigNumeric.

Key stores: src/store/app.ts (profile, auth, pinnedExerciseId), src/store/routines.ts, src/store/workouts.ts. All hydrate from AsyncStorage in app/_layout.tsx.

Optimization scoring: computeOptimizationScore (history-based, used by coach) vs computeRoutineScore (routine structure-based, used by routines tab). volumeBalance/RoutineScoreBreakdown.volume measure SETS — NOT the removed totalVolumeKg.
