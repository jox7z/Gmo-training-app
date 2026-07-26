---
name: project-overview
description: Gmo Training App overview — React Native/Expo fitness app with Supabase code through migration 0046
metadata:
  type: project
---

Gmo Training App is a React Native/Expo SDK 54 fitness app using expo-router, Zustand stores, TypeScript strict mode, and path alias `@/*`.

**Why:** Personal fitness tracker with social features. Frontend ~70-85% complete. Supabase backend deployed.

**Social stream (2026-07-22):** edge-to-edge presentation is client-only. No schema,
RLS, RPC, storage or migration change. `Post`, legacy/enriched metadata and migration
`0046` contracts remain unchanged.

**Section/skeleton pass (2026-07-22):** client-only presentation. No Post, query,
RLS, RPC, storage or migration change. React Query cached/refetch/pagination
semantics remain authoritative.

Historical migrations through 0035 covered events and scoring:
- 0034_event_management: update_event/delete_event RPCs; bucket covers + RLS policies
- 0035_event_comments_scores: event_comments table; list/add/delete_event_comment RPCs; recompute_event_scores; trigger trg_workout_event_score; join_event actualizado con backfill
- Columnas workouts usadas para score: user_id, started_at, ended_at
- REVOKE EXECUTE FROM anon en todas las nuevas RPCs; trigger function revocada de anon+authenticated

Current backend is deployed through `0046_fix_workout_pr_total_order.sql`
(remote version `20260722140530`).
`0041` adds atomic workout snapshot sync, `0042` closes its ACL to authenticated
users and `0043` prevents a stale retry from unpublishing a workout.
`0044_enrich_workout_post_metadata.sql` keeps the RPC signature and adds exact
duration, effective sets, reps, `kg·rep`, ordered primary muscles and exercise rows
to `posts.metadata`; execution stays restricted to authenticated. Client parsing
lives in `src/lib/workoutPostMetadata.ts` with legacy fallbacks.
`0045` adds the historical cutoff; `0046` preserves the contract and uses
`(started_at, coalesce(created_at, started_at), id)` as the total PR order.
Migration-history warning: live records `0044`/`0045`/`0046` as timestamps
`20260722134052`/`20260722135450`/`20260722140530`, the
repo uses numeric filenames, and the hosted ledger lacks `0001–0028`. A normal
`db push` detects drift; `--include-all` risks replay. Do not repair recent files alone.
Link/authenticate CLI, audit the historical schema, then reconcile the full ledger.

**totalVolumeKg removed** from Workout type, all stores, DB insert payload, mapping, UI (Summary, publish, profile, settings, coach), Heatmap (now uses totalReps), optimizationScore.scoreProgression (now uses totalReps). exerciseTopWeight exported from workoutCompare.ts.

Current progress components: `TimeSeriesChart` (interactive SVG) and
`ProgressInsightsSection` (load/reps/recorded time by exercise) plus
`ExerciseProgressPicker` (local trained-list search, Recent/Most trained/All and
catalog-backed muscle/equipment filters with bundled WebP thumbnails/fallback).
Its fixed sheet height is presentation-only; filtering never writes local/server state.
`ExerciseProgressModal` and `ExercisePickerModal` were removed as redundant.

Current progress libs: `src/lib/progressInsights.ts` and
`src/lib/exerciseDetails.ts`. Both accept only completed non-warmup sets and reuse
`hasValidSetPerformance` for the 1–999 reps / 0–1000 kg bounds.

AppStore no longer persists a pinned exercise; exercise selection is local to
the current Progress view. Picker search/filter/sort adds no Supabase query, RPC,
RLS, migration or query-key contract; unknown legacy exercise IDs stay searchable.

Progress tab: one factual exercise trend plus a separate body-weight section.
It has no estimated strength, automatic verdict, rank, streak, leaderboard or
duplicated muscle map.
Chart points retain `workoutId` and open the exact factual session ledger.
Work is not a selectable trend/record; `volume_kg` remains only in factual ledgers,
social metadata/card/share and migrations `0044–0046`.

Privacy and notification toggles were removed from Settings: the prior values were
AsyncStorage-only and had no RLS/native enforcement. Any return needs a full server
or native implementation, not profile-only fields.

Keyboard fix in active.tsx LogPhase: KeyboardAvoidingView (iOS padding), InputAccessoryView "Listo" button, returnKeyType="done", blurOnSubmit, onSubmitEditing=Keyboard.dismiss on BigNumeric.

Key stores: src/store/app.ts (profile/auth), src/store/routines.ts and
src/store/workouts.ts. All hydrate from AsyncStorage in app/_layout.tsx.

**Coach IA feature ELIMINADA** (2026-06-12, migración 0040_drop_ai_coach): frontend ya removido (app/coach.tsx, src/lib/coach.ts, queries/repos coach). Backend dropeado: tablas ai_conversations, ai_messages, ai_response_cache, ai_usage_log; funciones ai_usage_remaining(), increment_cache_hit(text). Edge function `coach` NUNCA estuvo desplegada en live (list_edge_functions=[]). Bloque [functions.coach] removido de config.toml; dir supabase/functions/coach/ borrado. **generate_routine se queda** (no usaba ninguna tabla/RPC del coach; comparte secrets GEMINI/ANTHROPIC/OPENAI_API_KEY que NO se borraron). NOTA: ninguna edge function está desplegada en live actualmente — solo existen como código local.

Optimization scoring: computeOptimizationScore (history-based, antes usado por coach) vs computeRoutineScore (routine structure-based, used by routines tab). volumeBalance/RoutineScoreBreakdown.volume measure SETS — NOT the removed totalVolumeKg.
