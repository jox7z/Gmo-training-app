---
name: gmo-domain-guardrails
description: Preserve GMO Training product truth and high-risk domain invariants. Use when changing workouts, routines, progress, achievements, profiles, auth, social publishing, privacy, Supabase mappings, or navigation.
---

# GMO domain guardrails

Read `AGENTS.md` and the touched source before editing. Keep Spanish UI copy.

## Training truth

- Store weight in kilograms. Format exercise-set weight with `src/lib/units.ts`; format body weight with `src/lib/progress.ts`.
- Finish workouts only through `src/lib/workoutValidation.ts`. Require a completed working set; treat pending sets as a warning.
- Build progress from completed, non-warmup sets. Expose top load, total reps, or recorded active time.
- Keep work as factual `kg·rep` or `lb·rep` in ledgers and social summaries only.
- Never add estimated maxes, rep prescriptions, opaque scores, comparative verdicts, or automatic improved/declined copy.
- Routine quality uses only `src/lib/routineQualityScore.ts`: deterministic 0–100
  coverage, volume, frequency and structure with visible breakdown. Never persist
  it, hide the formula, emit weak groups, prescribe changes or predict results.
- Use `src/lib/muscleVolume.ts` and `MuscleVolumeMap` for equivalent-set estimates. Keep the disclaimer and factual contributors; do not infer recovery, growth or diagnosis.
- Keep `MuscleVolumeMap` in routine planning, not Progress. Progress strength uses
  `trainingCalendar.ts` and `muscleMilestones.ts`, reusing the four
  `ACHIEVEMENTS` strength tracks and their thresholds.
- Parse set drafts through `numericInput.ts`, commit them before completion, and
  mutate only through stable exercise-entry/set IDs. Stale or invalid patches
  return `false`; optional haptics never decide whether data persists.
- Give `ExerciseProgressPicker` only trained exercises. Preserve legacy IDs, local selection, and complete-list search. Apply sheet behavior from `gmo-mobile-product-design` and image behavior from `gmo-mobile-assets`.

## State and navigation

- Keep persisted Zustand client state separate from React Query server state.
- Hydrate local stores regardless of auth. Clear profile, workouts, routines, achievements, and query cache on logout or account change.
- Let `app/_layout.tsx` own auth and onboarding routing. Preserve its timeouts and server `is_profile_complete` decision.
- Whitelist every new authenticated top-level route.
- Request a main tab through `src/store/mainTabs.ts` before returning to `/(tabs)` from outside the pager.
- Persist the ordered selection in live `profiles.goals`; `goals[0]` mirrors into
  legacy `goal`. Keep `secondaryGoals` unique, optional, and excluding the primary.

## Social and privacy

- Normalize remote rank IDs with `resolveUserRank` and rank-up metadata with
  `resolveRankMilestone`. Never use the current profile rank as historical fallback.
- Parse workout post data through `src/lib/workoutPostMetadata.ts`. Render through `WorkoutShareCard`.
- Call `markWorkoutPublished` after successful publication. Keep publication monotonic and serialize the full sync/upload/RPC path.
- Order historical PR baselines by `(started_at, coalesce(created_at, started_at), id)` and never compare against future sessions.
- Treat workout visibility as the source of truth. Enforce `public | followers | private` in RLS and every security-definer RPC.
- Do not attach restricted workout media while `post-photos` is public.
- Do not expose privacy or notification controls until their server or native behavior is real, persisted, and verified.

## Existing boundaries

- Keep achievements fully client-side and offline. Extend `ACHIEVEMENTS`; do not add Supabase tables.
- Do not restore the removed AI coach or client Instagram OAuth/verification flow.
- Never write `instagram_verified` or `instagram_user_id` from profile mapping.
- Save workouts through the transactional `sync_workout_snapshot` contract. Never swallow duplicate-parent errors or accept partial child state.
- Do not push or partially repair migrations before reconciling the complete
  hosted ledger described in `AGENTS.md`. `0051`/`0052` are repo-only; the
  timestamped multi-goal and account-delete files already exist live.
- Treat live `recalc_weekly_ranks()` as a P0 until ledger-safe remediation:
  Data API callers can execute it, repeated calls double-apply awards, and its
  six legacy thresholds disagree with the nine client ranks.
