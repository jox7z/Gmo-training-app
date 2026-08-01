---
name: project-overview
description: Gmo Training App overview — Expo fitness app; live ledger through 20260727223657, 0051/0052 repo-only
metadata:
  type: project
---

Gmo Training App is a React Native/Expo SDK 54 fitness app using expo-router, Zustand stores, TypeScript strict mode, and path alias `@/*`.

**Why:** Personal fitness tracker with social features. Current priority is
pre-release stability; schema changes `0051`–`0052` remain repo-only.

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

Current live schema includes the changes represented by `0047`–`0050`, followed
by timestamped multi-goal/grants and account-delete migrations through
`20260727223657`. `0051` and `0052` remain repo-only.
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

**totalVolumeKg removed** from Workout type, stores and comparative UI. Work remains
only as factual session/social data. `exerciseTopWeight` is exported from
`workoutCompare.ts`.

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

Progress tab: one factual exercise trend, a current-week estimated muscle-volume
map and a separate body-weight section. The map uses primary 1 / secondary 0.5
equivalent sets and fixed reference bands; it is not recovery or diagnosis.
`routineQualityScore.ts` separately derives a local transparent 0–100 score with
coverage/volume/frequency/structure and no persistence or Supabase contract.
Chart points retain `workoutId` and open the exact factual session ledger.
Work is not a selectable trend/record; `volume_kg` remains only in factual ledgers,
social metadata/card/share and migrations `0044–0046`.

Workout privacy uses `workouts.visibility`; profile stores only the default.
`0052` must enforce owner/follower/stranger in RLS and every social SECURITY DEFINER
RPC. Restricted media stays blocked because `post-photos` is public. Until deployment,
legacy Public publish falls back; Followers/Private fail visibly.

Keyboard fix in active.tsx LogPhase: KeyboardAvoidingView (iOS padding), InputAccessoryView "Listo" button, returnKeyType="done", blurOnSubmit, onSubmitEditing=Keyboard.dismiss on BigNumeric.

Key stores: src/store/app.ts (profile/auth), src/store/routines.ts and
src/store/workouts.ts. All hydrate from AsyncStorage in app/_layout.tsx. Logout and
account switches run serialized local resets across profile, workouts, routines,
achievements and Query cache. An auth timeout preserves local data and accepts a
late valid `INITIAL_SESSION`/`getSession` result.

**Coach IA feature ELIMINADA** (2026-06-12, migración 0040_drop_ai_coach):
frontend/backend removidos. `generate_routine` permanece como estructura heurística
sin reasoning, proveedor ni consejo automático; el cliente no la invoca y live no
tiene edge functions desplegadas. Secrets viejos pueden seguir configurados, sin uso.

Routine optimization scoring was removed on 2026-07-26: no `/100`, weak groups or
automatic routine guidance. A factual interactive volume map now appears in the
editor and active routine.

Profile goals live in ordered `profiles.goals`; `goals[0]` mirrors into legacy
`goal`. Custom onboarding returns from the editor explicitly to the Routines tab.
