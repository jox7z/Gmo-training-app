# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gmo Training — a Strava-inspired gym training app: workouts, weekly streaks, a ranked
points system, and a social feed. Expo (managed) + React Native + Supabase.
The app and most code comments/UI strings are in **Spanish**; match that when editing.

The README is synchronized with the current SDK/catalog baseline. The code remains
authoritative: `package.json` (SDK 54, RN 0.81, React 19, Reanimated 4),
`src/data/exercises.ts` (catalog), and `src/theme/tokens.ts` (ranks).

## Commands

```bash
npm start            # Expo dev server (scan QR with Expo Go)
npm run android      # / npm run ios / npm run web
npm run tunnel       # expo start --tunnel (device on a different network)
npm run lint         # expo lint (eslint-config-expo, flat config)
npm run typecheck    # tsc --noEmit  — run this after changes; strict mode is on
npm test             # Jest + jest-expo; pure lib contracts
```

Pure logic is covered by Jest (`jest-expo`) under `src/lib/__tests__/`.
Verification means `npm test` + typecheck + lint, then Expo Go for UI/lifecycle.

Supabase (backend is already deployed to a real project; `.env` holds live keys):

```bash
supabase functions deploy generate_routine
# Migrations live in supabase/migrations/ (0001..00NN) and apply in numeric order.
```
## Subagents
- Route by ownership instead of invoking Supabase for every task:
  - `gmo-visual-director`: read-only visual brief, hierarchy, states and allowlist.
  - `react-native-ui-engineer`: presentation-only Expo/RN implementation.
  - `motion-performance-engineer`: Reanimated, gestures, haptics and measured motion.
  - `mobile-visual-qa`: read-only screenshot/device/state review.
  - `react-native-performance-auditor`: read-only FPS/render/image/bundle evidence.
  - `supabase-fullstack-engineer`: domain helpers, auth, repos, queries, stores,
    persistence, auth gating in `app/_layout.tsx`, media privacy, Storage, RLS,
    RPCs, Edge Functions or migrations.
  - `build-verify` and `code-quality-reviewer`: final automated and code gates.
- **Caveman is permanent for every agent.** Start delegated prompts with `CAVEMAN`,
  require action-first concise reporting, strict ownership and no filler. The single
  source is `.claude/skills/caveman.md`.
- Visual agents must read the relevant `.claude/skills/gmo-*`,
  `mobile-visual-*` and `react-native-performance.md` contracts. They may render
  existing hooks/selectors but must not mutate data contracts or forbidden paths
  without a handoff to `supabase-fullstack-engineer`.
- `react-native-ui-engineer` may edit visual theme values only inside its allowlist;
  rank IDs, thresholds and progression semantics are domain-owned.

## Architecture

### Routing (Expo Router, file-based)
`app/` is the route tree. `experiments.typedRoutes` is on, so route strings are
type-checked. Path alias **`@/*` → `src/*`** (see `tsconfig.json`).

`app/_layout.tsx` is the **single source of truth for navigation/auth gating** — it is
the only place that decides where the user goes. Key invariants there:
- When Supabase is configured, the **server** decides onboarding state via the
  `is_profile_complete` RPC (`profileComplete` in the store), **not** the local
  `onboarded` flag. The local flag is only a fallback when a network call *fails*
  (distinguishing "profile doesn't exist" → signOut, from "network timed out" → keep
  the user in). This split exists to fix a real bug where stale AsyncStorage skipped
  onboarding for new accounts.
- Every auth/profile fetch is wrapped in a timeout (`withTimeout`, `FETCH_TIMED_OUT`
  sentinel) because Android cold starts can hang the Supabase auth call and freeze the
  splash loader forever. Don't remove these guards.
- Routes outside `(tabs)` that are still "authed" (modals, profile sub-pages, etc.) are
  whitelisted in `inAllowedAuthedRoute`; add new top-level authed routes there or they
  get bounced to `/(tabs)`.

### State: two layers, kept separate
- **Local client state — Zustand** (`src/store/app.ts`, `workouts.ts`, `routines.ts`),
  each persisted to AsyncStorage and `hydrate()`d at startup *regardless of auth*.
  `app.ts` holds the user profile, derived weekly progress and onboarding flag.
  `src/lib/weeklyStreak.ts` derives streak/days-this-week from history plus
  `weeklyGoalDays`. `workouts.ts` holds the
  active workout + history and computes totals (reps, active/rest seconds) on finish.
  Its serialized AsyncStorage queue reports write failures, and hydration validates
  the persisted shape before replacing safe defaults.
  `profileComplete` is session-only state and is deliberately **not** persisted.
  Logout and account changes clear profile, workouts, routines, achievements and
  React Query cache through serialized resets; never merge local history across users.
- **Server state — React Query** (`@tanstack/react-query`). Provider + a global
  `QueryClient` are in `app/_layout.tsx`; window-focus refetch is wired to React
  Native `AppState` via `focusManager`.

### Data access: repos vs queries
- `src/lib/repos/*` — plain async functions that talk to Supabase (the only place
  raw `supabase.from(...)`/RPC calls and DB-row↔domain mapping live).
- `src/lib/queries/*` — React Query hooks wrapping repos: query-key factories
  (e.g. `feedKeys`), optimistic updates (`onMutate`/`onError` rollback), and cache
  invalidation. The feed is an `useInfiniteQuery` with cursor paging; mutations patch
  the infinite cache in place rather than refetching to preserve FlashList scroll.
- `src/lib/supabase.ts` — the client, the `isSupabaseConfigured` guard, and
  `callEdgeFunction`. When Supabase isn't configured the app runs offline against
  local stores using the `LOCAL_USER_ID` sentinel (`'local-user'`).

### Edge functions (Deno) — `supabase/functions/`
- `generate_routine/` — authenticated heuristic routine structure. It returns
  editable days/exercises without scores, reasoning or automatic advice. The client
  currently uses its local equivalent and has no edge-function entry point.
  > The **AI coach was fully removed** (migration `0040_drop_ai_coach.sql`): the
  > `coach/` function, the `coach.tsx` screen + `src/lib/{coach,queries/coach,repos/coach}.ts`,
  > and the DB objects `ai_usage_log`, `ai_response_cache`, `ai_conversations`,
  > `ai_messages`, `ai_usage_remaining()`, `increment_cache_hit()` are all gone. Don't
  > reintroduce coach wiring. Provider secrets may remain configured remotely but
  > current repository code does not consume them.
- `instagram_oauth/` — **legacy, no client entry point**: the Instagram OAuth linking
  flow was removed from the app (no screen calls it anymore; `src/lib/instagram.ts`
  was deleted). The function and its secrets (`IG_APP_ID`, `IG_APP_SECRET`,
  `IG_STATE_SECRET`) remain in the repo/backend but are inert. Don't wire new UI to
  it without re-reading its deploy notes (`--no-verify-jwt`, public GET `/callback`).

## Domain rules to respect

- **Weight unit:** the DB always stores **kg**; display converts to the user's unit.
  Use `src/lib/units.ts` `formatWeight` for *exercise set* weights (treats `<= 0` as
  bodyweight → "Peso corporal"); use the separate `formatWeight` in `src/lib/progress.ts`
  for *body-weight* tracking. They are not interchangeable.
- **Ranks** are defined in `src/theme/tokens.ts` (9 tiers: rookie, bronze, silver, gold,
  platinum, diamond, elite, titan, olympus, with `min` point thresholds). `tokens.ts` is
  authoritative — the README's thresholds are outdated. `migrateProfile` in `app.ts`
  remaps the legacy `legend` rank to `olympus`. Each rank has a **custom emblem image**
  (LoL-style crest) bundled at `assets/ranks/<id>.png`, mapped statically in
  `src/theme/rankImages.ts` (`RANK_IMAGES`, keyed by `RankId` — RN can't `require()` a
  dynamic path, so the map is spelled out). `RankBadge`, the profile hero
  (`app/(tabs)/profile.tsx`) and ranking surfaces render the emblem. The shipped
  PNGs are original real crests; their atlas/master lives in
  `assets/brand/`. Preserve filenames and the static map when replacing them.
  Render shared crests through `RankEmblem`. Social `rank_up` metadata resolves
  through `resolveRankMilestone`: require both old/new ranks, accept camel/snake
  keys, map `legend` to `olympus`, celebrate only promotions and keep invalid,
  equal or descending changes neutral. Normalize remote profile ranks through
  `resolveUserRank`, preferring finite non-negative points. Live
  `recalc_weekly_ranks()` is a P0: legacy thresholds, non-idempotent updates and
  EXECUTE for PUBLIC/anon/authenticated. Do not deploy an isolated correction
  before ledger reconciliation.
- **Workout numeric editor:** `numericInput.ts` owns comma parsing, finite checks,
  rounding and bounds. Reps stay integer 1–999 and stored weight 0–1000 kg.
  Update active sets through stable entry/set IDs; stale mutations return `false`.
  Commit both drafts before save, serialize valid changes through the persistence
  queue, and never let haptic failure reject the mutation.
- **Routine quality score:** `src/lib/routineQualityScore.ts` is the only source.
  It returns a deterministic 0–100 score from coverage (35%), volume (30%),
  frequency (20%) and structure (15%), rendered through `RoutineQualityCard`.
  Show the compact `GMO Rating` radial, the four-part 2×2 breakdown and one
  planning disclaimer; hide contributed points and long explanations. It is
  local/derived only:
  never persist it, hide the formula, add weak-group verdicts, prescribe changes,
  infer recovery or promise results.
- **Achievements (logros)** — Duolingo-style tiered system, **fully client-side & offline**
  (no Supabase tables). `src/lib/achievements.ts` is the authoritative catalog + pure
  engine: each track has escalating *tiers* and a `measure(ctx)` derived entirely from
  local `Workout[]` history + streak. Categories: `strength` (all-time top-set weight per
  big lift — bench-press/squat/deadlift/overhead-press — at standard kg milestones),
  `streak` (consecutive weeks meeting `weeklyGoalDays`, computed from history with
  grace for the current incomplete week), `consistency`
  (workout count, lifetime reps), `variety` (distinct exercises). `src/store/achievements.ts`
  persists unlocked tierIds+dates (`gmo:achievements:v1`, payload version 2) and `sync(ctx)` returns only the
  *newly* unlocked for celebration. The `seeded` flag does a one-time **silent backfill at
  startup** (`app/_layout.tsx`, after hydration) so existing history doesn't spam the
  celebration. Version 2 silently re-seeds only legacy `streak-*` tiers after the
  history-based rule change, preserving every other unlock date. `finalize()` in
  `app/workout/active.tsx` calls `sync` after `finishWorkout` and
  queues new unlocks into `AchievementUnlockModal` over the Summary. UI: full screen
  `app/achievements.tsx` (whitelisted authed route), `AchievementMedal` + `AchievementUnlockModal`
  in `src/components/achievements/`, and the profile "Logros" tab renders real engine data.
  To add a track/tier, edit `ACHIEVEMENTS` only — UI and store pick it up automatically.
- **Instagram:** the OAuth linking/verification flow was retired from the client —
  only the manual, unverified `instagram_username` field remains (edited in
  `app/profile/edit.tsx`, displayed/opened via `openInstagram` from `src/lib/linking.ts`).
  `profiles.instagram_verified`/`instagram_user_id` still exist in the DB and the
  trigger `protect_instagram_verification` (migration 0039) still blocks any client
  write to them (it auto-degrades to unverified when `instagram_username` changes).
  Never add these columns to `toDb()` in `src/lib/repos/profile.ts`. The
  `instagramVerified` field may linger in types/mappings for existing data, but no UI
  shows a verified badge anymore.
- **Exercise images** are bundled (not remote) in `assets/exercises/<id>.webp`, generated
  by `scripts/fetch-exercise-images.mjs` (public-domain source) so the picker works
  offline. Regenerate via that script rather than hand-adding files.
- **External exercise dataset:** `scripts/sync-exercises-dataset.mjs` pins
  `hasaneyldrm/exercises-dataset` and imports only conservatively matched
  instruction metadata. Never copy its `images/` or `videos/`: Gym visual owns
  them and cloning grants no media license. See `THIRD_PARTY_NOTICES.md`.
- **Brand identity:** `assets/icon.png` is the single runtime source for app icon,
  splash and adaptive icon. The reusable robot mascot is the 25 KB
  `assets/brand/gmo-mascot.webp`, exposed through `src/components/GmoMascot.tsx`.
  Do not fork per-screen copies.
- **Progress metrics:** use only completed, non-warmup sets. Exercise trends expose
  only top load, total reps or recorded active time; body weight stays separate.
  Work (`weightKg * reps`) is not a selectable progress metric or comparative
  record; keep it only as factual `kg·rep`/`lb·rep` in session ledgers and social
  workout summaries. Flat or falling trends are valid. Never add estimated max
  formulas, rep prescriptions, opaque scores or automatic verdicts. Reuse
  `hasValidSetPerformance` for the 1–999 reps / 0–1000 kg bounds.
- **Muscle-volume map:** `src/lib/muscleVolume.ts` owns planned and completed
  muscle-volume calculations. It exposes estimated equivalent sets: primary 1,
  secondary 0.5, with optional per-exercise overrides. Reference zones are
  0 none, <5 minimal, 5–9.5 effective, 10–20 productive and >20 very high.
  `MuscleVolumeMap` is the shared interactive view in routine editor and active
  routine, not Progress. Keep its estimation disclaimer and factual
  exercise/frequency breakdown. The separate transparent routine score may consume
  these bands; never infer recovery, diagnosis or automatic advice from them.
- **Progress calendar and muscle milestones:** `trainingCalendar.ts` owns the fixed
  Monday-first 6×7 monthly grid, current-month clamp, local civil dates and exact
  workout drill-down. `muscleMilestones.ts` reuses the four strength tracks and
  thresholds in `ACHIEVEMENTS`, accepts only completed non-warmup plausible sets,
  retains load/reps/date/session evidence and lowers secondary muscles one level.
  Never add estimated 1RM, population comparisons or duplicate thresholds. Its
  stable searchable selector contains `Todos`, 12 muscles and hit/no-hit sections;
  filtering changes only results and keyboard opening elevates/shrinks that region.
- **Exercise progress picker:** `ExerciseProgressPicker` receives only exercises
  already present in `buildExercisePerformance(history)`, never the full catalog.
  Search runs over that complete trained list with diacritic-insensitive matching;
  Recent shows the latest six, Most trained sorts by session count, and muscle /
  equipment filters use catalog metadata. Unknown legacy IDs remain visible in
  All and search. Keep selection local to the screen; do not add persistence,
  Supabase aggregation, recommendations or progression verdicts. Picker rows reuse
  bundled `exerciseImage(id)` assets through `expo-image`; missing/legacy IDs fall
  back to the dumbbell icon. Never fetch exercise thumbnails remotely. Keep the
  picker sheet at a stable height: filtering/search changes only the results region,
  never the header, controls or sheet position. Muscle selection uses an internal
  two-column grid with `Todos`.
- **Workout history detail:** `WorkoutResultsModal` is a factual session ledger.
  Keep duration, effective sets, reps, work and recorded set rows; never restore
  congratulatory comparison cards, deltas or automatic improvement copy. Points in
  `TimeSeriesChart` open the exact `workoutId` represented by the chart.
- **Social workout metadata:** migration `0044` enriches `posts.metadata` without a
  new table/column. Parse it only through `src/lib/workoutPostMetadata.ts`; legacy
  `duration_min`/`muscle_group` posts remain supported. `WorkoutShareCard` is the
  shared composer/feed visual. Successful publication must call
  `markWorkoutPublished`, and published sessions stay out of the composer.
  Migration `0046` gives PR baselines a total order over
  `(started_at, coalesce(created_at, started_at), id)`; future sessions and equal
  timestamps cannot create duplicate historical PRs.
- **Workout privacy:** `Workout.visibility` and
  `profiles.default_workout_visibility` use `public | followers | private`; legacy
  data defaults to `public`. The workout is the source of truth. Restricted workout
  posts must be filtered consistently by RLS and every `SECURITY DEFINER` social
  RPC. `post-photos` remains public, so followers/private workouts cannot attach a
  photo until media uses private storage and signed URLs.
- **Social stream layout:** public/social surfaces opt into `Card variant="stream"`
  and `SocialStreamColumn`: full width on phones, max 600 px centered on larger
  screens, no lateral border/radius and 8 px between posts. Reusable social cards
  default to `contained`, so Feed/community/discovery/profile call sites must pass
  `layout="stream"` explicitly. Keep copy/actions inset 16 px, media full-bleed 4:5
  and tap targets at least 44 px. Forms, modals, auth, routines, Progress, private
  history and settings remain contained. Public profile galleries use 3 columns,
  1 px gaps and no outer margin.
  Feed refresh uses `StaticPullToRefresh`: only the GMO SVG descends, the list
  remains fixed, 72 px vertical intent triggers manual refresh, horizontal intent
  yields to `PagerView` through manual direction-dominance activation, and Reduce
  Motion leaves the indicator static. Preserve a visible 44 px `Actualizar feed`
  action and announce results from the shared refresh action.
- **Section surfaces:** informational panels use `Card variant="section"`: square,
  top/bottom separators only, no lateral border. `raised` remains for compact
  selectable/navigable tiles, forms and controls. Inputs, buttons, state badges,
  modals and genuine circles keep their own complete border geometry.
- **Loading skeletons:** reuse `src/components/ui/Skeleton.tsx`; one
  `SkeletonGroup` owns one pulse for all child bones. Skeletons replace only an
  initial empty load, never cached data during refetch, pagination indicators,
  pull-to-refresh or mutation feedback. Reduce Motion keeps them static.
- **Motion preference:** `useReduceMotion` treats the initial unknown state as
  reduced. Never start an entrance or native-modal animation before the system
  preference resolves.
- **Sheet focus:** new `Sheet` call sites provide `returnFocusTarget` when opened
  from a concrete control. Use `initialFocusRef` when its title is not the best
  first screen-reader target.
- **Personal profile:** own profile is a factual dashboard over one FlashList root:
  compact rank strip, overlapping 72 px avatar, identity/summary, sticky tabs,
  canonical `FeedItem` posts with pagination, activity and achievements. The
  three-dot menu owns Share Profile and Settings; no gear or Account card.
  Settings alone owns sign-out.
- **Reduce Motion:** active-workout phase/splash/rest/summary motion,
  routine-editor entrances and repeating PR effects resolve to static state and
  stop stale animations.
- **Profile goals:** live `profiles.goals` stores the ordered selection and mirrors
  `goals[0]` into legacy `goal`. `secondaryGoals` are the remaining unique
  priorities and do not merge training prescriptions. `complete_signup` accepts
  `goals text[]`. Custom onboarding
  enters the editor with `origin=onboarding` and returns explicitly to the requested
  Routines tab instead of relying on `router.back()` after `replace`.
- **Settings honesty:** workout privacy is valid only with migration `0052` and full
  RLS/RPC enforcement. Notifications stay absent until native delivery and contextual
  permission exist.

## Conventions

- All UI colors/spacing/radii/ranks come from `src/theme/tokens.ts`; reusable UI
  primitives are in `src/components/ui/`. The app is dark-mode only.
- Surfaces use the almost-square radius tokens (2–4 px). Reserve `radius.full`
  for genuine circles such as avatars, dots, rings and circular indicators.
- **Press feedback:** use `src/components/ui/PressableScale.tsx` (Reanimated spring
  scale + optional haptic) instead of bare `Pressable` for tappable cards/icons.
  `Button` has its own built-in effect — don't wrap it. List items in the training
  section animate with `FadeInDown` (stagger capped at `Math.min(i, 8)`) +
  `LinearTransition`; never put `entering`/`layout` on FlashList items (recycler crash).
- New IDs: `uuidv4()` from `src/lib/ids.ts`.
- Workout save (`repos/workouts.ts`) is retry-safe through the transactional
  `sync_workout_snapshot` RPC (migration `0041`): advisory lock per workout,
  ownership validation, parent upsert and atomic child rebuild. Calls for the same
  workout are also serialized in-process. Never restore the old behavior that
  swallowed `23505` or returned merely because the parent existed. Migration
  `0042` restricts RPC execution to `authenticated`; do not broaden that grant.
  Migration `0043` makes publication monotonic; sync must never revert an existing
  `is_published = true`. Migration `0044` keeps the same
  `publish_workout(uuid,text,text,text)` signature, locks the workout row, publishes
  factual metadata and grants execution only to `authenticated`; `0045` corrects
  the temporal PR baseline and `0046` stabilizes timestamp ties. Hosted migration
  history records these as `20260722134052`, `20260722135450` and `20260722140530`,
  while the repo uses numeric filenames and the historical ledger is incomplete.
  Never use `db push --include-all` or repair only `0044`/`0045`/`0046`;
  link/authenticate CLI, audit the live schema and reconcile the
  full ledger with `supabase migration repair` first.
  Live continues through `20260727210212`/`20260727211100` (multi-goal system)
  and `20260727223657` (account deletion); exact SQL mirrors now exist locally.
  `0051` and `0052` remain repo-only until the complete hosted ledger is
  reconciled. The retired `0053_profile_goals.sql` contract must not be deployed:
  live uses `profiles.goals`, not `profiles.secondary_goals`.
- The persistent main `PagerView` consumes explicit external tab requests from
  `src/store/mainTabs.ts`; a child pathname by itself does not select a page.

## MCP
- If we have made any change on the Supabase data base, the supabase-fullstack-engineer agent needs to complete the changes

## End
- Treat Markdown as part of definition of done. Update checklist, affected
  roadmaps, this file/AGENTS and skills after each completed request.
