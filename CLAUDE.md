# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gmo Training — a Strava-inspired gym training app: workouts, weekly streaks, a ranked
points system, and a social feed. Expo (managed) + React Native + Supabase.
The app and most code comments/UI strings are in **Spanish**; match that when editing.

The README is partly stale (it claims Expo SDK 51 / Reanimated 3 / 24 exercises and
old rank thresholds). Trust the code: `package.json` (SDK 54, RN 0.81, React 19,
Reanimated 4), `src/data/exercises.ts` (catalog), and `src/theme/tokens.ts` (ranks).

## Commands

```bash
npm start            # Expo dev server (scan QR with Expo Go)
npm run android      # / npm run ios / npm run web
npm run tunnel       # expo start --tunnel (device on a different network)
npm run lint         # expo lint (eslint-config-expo, flat config)
npm run typecheck    # tsc --noEmit  — run this after changes; strict mode is on
```

There is **no test runner configured** — no `test` script and no test files. "Verifying"
a change means `npm run typecheck` + `npm run lint`, and exercising it in Expo Go.

Supabase (backend is already deployed to a real project; `.env` holds live keys):

```bash
supabase functions deploy generate_routine
supabase secrets set GEMINI_API_KEY=... ANTHROPIC_API_KEY=... OPENAI_API_KEY=...
# Migrations live in supabase/migrations/ (0001..00NN) and apply in numeric order.
```
## Subagents
- Always after creating the plan for any feature or change, use the agent of supabase-fullstack-engineer. After completing all the process always check with the code-quality-reviewer agent. If the plan its a new feature, clear the context of the subagent.

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
  `app.ts` holds the user profile, streak, onboarding flag. `workouts.ts` holds the
  active workout + history and computes totals (reps, active/rest seconds) on finish.
  `profileComplete` is session-only state and is deliberately **not** persisted.
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
- `generate_routine/` — AI routine generation (pairs with the offline heuristic in
  `src/lib/routineGenerator.ts`). Uses the shared provider secrets
  (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
  > The **AI coach was fully removed** (migration `0040_drop_ai_coach.sql`): the
  > `coach/` function, the `coach.tsx` screen + `src/lib/{coach,queries/coach,repos/coach}.ts`,
  > and the DB objects `ai_usage_log`, `ai_response_cache`, `ai_conversations`,
  > `ai_messages`, `ai_usage_remaining()`, `increment_cache_hit()` are all gone. Don't
  > reintroduce coach wiring. The provider secrets stayed (shared with generate_routine).
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
  (`app/(tabs)/profile.tsx`) and the rank ladder (`app/(tabs)/progress.tsx`) render the
  emblem. The shipped PNGs are **placeholders** (a copy of the app icon); dropping the
  real artwork in with the same filenames is all that's needed — no code change.
- **Muscle optimization** uses fractional set counting: a primary muscle gets 1 set per
  working set, each `secondary` muscle gets 0.5. See `Exercise` in `src/data/exercises.ts`
  and `src/lib/optimizationScore.ts`.
- **PRs / 1RM / previous-session data** all derive from local `Workout[]` history via
  pure helpers: `src/lib/workoutCompare.ts` (`detectPRs`, `historicMaxWeight` — live PR
  splash in `app/workout/active.tsx` uses the same helper as the summary so they never
  disagree; `previousExerciseSets` powers the per-set autofill + "Anterior" line) and
  `src/lib/oneRepMax.ts` (Epley/Brzycki `estimate1RM`, `computeExerciseRecords` — always
  filter `isCompleted && !isWarmup && weightKg > 0`). The Records screen is
  `app/records.tsx` (whitelisted authed route), linked from the profile "Logros" tab.
  All math stays in kg; convert only at render time.
- **Medal colors** (podiums, PR gold) come from `colors.medal` + `podiumColor(position)`
  in `src/theme/tokens.ts` — don't hardcode `#FFD700`/`#C0C0C0`/`#CD7F32` again.
- **Tabs are a PagerView, not a navigator** (`app/(tabs)/_layout.tsx` holds a local
  `activeIndex`): there is no navigable `/(tabs)/<tab>` route. To switch tabs from
  outside, use the `registerTabSetter`/`goToTab` singleton in `src/lib/tabsNav.ts`
  (used by `StartWorkoutFab`, the feed's floating "start workout" CTA).
- **Achievements (logros)** — Duolingo-style tiered system, **fully client-side & offline**
  (no Supabase tables). `src/lib/achievements.ts` is the authoritative catalog + pure
  engine: each track has escalating *tiers* and a `measure(ctx)` derived entirely from
  local `Workout[]` history + streak. Categories: `strength` (all-time top-set weight per
  big lift — bench-press/squat/deadlift/overhead-press — at standard kg milestones),
  `streak` (consecutive-week streak via `weekStreakFromHistory`, computed from history
  because the local `streakWeeks` counter never increments past onboarding), `consistency`
  (workout count, lifetime reps), `variety` (distinct exercises). `src/store/achievements.ts`
  persists unlocked tierIds+dates (`gmo:achievements:v1`) and `sync(ctx)` returns only the
  *newly* unlocked for celebration. The `seeded` flag does a one-time **silent backfill at
  startup** (`app/_layout.tsx`, after hydration) so existing history doesn't spam the
  celebration; `app/workout/active.tsx finalize()` calls `sync` after `finishWorkout` and
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

## Conventions

- All UI colors/spacing/radii/ranks come from `src/theme/tokens.ts`; reusable UI
  primitives are in `src/components/ui/`. The app is dark-mode only. `app/` has ZERO
  hardcoded hex; in `src/` the only documented exceptions are OAuth brand logos,
  `PLATE_COLORS` (IWF), BicepIcon's inner SVG, `avatarColor.ts`'s fixed palette,
  `shadowColor '#000'`, and Icon.tsx custom SVGs — don't add new ones.
- **Typography:** `letterSpacing` is a token scale (tightest −2 … widest 4) — never
  write `letterSpacing:` inline; use `Text`'s `tracking` prop or the token. Variants
  `overline` (section labels) and `timer` (64px workout clock) exist for the workout
  screens. lineHeight lives ONLY in display-class variants (display/metric/metricLg/
  timer) and is auto-omitted when `adjustsFontSizeToFit` is set (fixed line-box +
  autosize clips glyphs).
- **Segmented toggles / icon buttons / chips:** use the shared primitives
  `SegmentedControl` (variant `inset`|`pill`, `fill`), `IconButton` (tones
  elevated/primary/danger/ghost, `badgeCount`, haptic off by default) and `Chip`
  (solid/outline/dashed, `leftIcon`, `onLongPress`) from `src/components/ui/` — never
  re-implement these inline. Deliberate exceptions: `DayChip` in workout (custom
  spring pop), `StepperButton` in BigStepperInput (chunky 3D), bare icons without a
  circle (WorkoutHeader close, profile gear, records back).
- **Exercise detail hub:** `src/components/ExerciseDetailSheet.tsx` (tabs
  Ficha/Historial/Récords) is THE exercise detail surface — a sheet, not a route (no
  nav-gate changes). Opened from the workout hero (`SetPhase onOpenDetail`,
  `showSelector={false}`), Records cards, and Progress. It absorbed
  `ExerciseProgressModal` — don't recreate per-screen exercise detail modals. The
  `key={exerciseId}` on its mount is what resets internal state per exercise.
- **Loading skeletons:** use the shared `src/components/ui/Skeleton.tsx` primitive
  (`Skeleton`, `SkeletonCircle`, `SkeletonRow`) for every load placeholder — never a
  bare `ActivityIndicator`/`Loader` on initial content load. It's a single Reanimated 4
  shimmer loop (LinearGradient sweep over `colors.bg.elevated`, band = `colors.bg.shimmer`)
  that honors `useReducedMotion`. Don't reintroduce classic `Animated.loop`/`new Animated.Value`
  for skeletons (`FeedSkeleton` is built on this primitive; `react-native-skeleton-placeholder`
  was rejected — its `react-native-linear-gradient` peer isn't in Expo Go). List skeletons
  only replace the *initial* empty/loading state, not pagination footers or inline search spinners.
- **Bottom sheets:** every sheet that slides up from the bottom goes through
  `src/components/ui/AppBottomSheet.tsx` (declarative `visible`/`onClose` wrapper over
  `@gorhom/bottom-sheet` v5 `BottomSheetModal` — baked-in backdrop, handle, `bg.card`
  surface). Inside a sheet use gorhom's scrollables/inputs (`BottomSheetFlatList`,
  `BottomSheetScrollView`, `BottomSheetTextInput`; fixed inputs via `footerComponent`),
  never the RN ones. If the sheet contains a chart with long-press tooltips, pass
  `enableContentPanningGesture={false}`. Screens presented as native modals
  (`workout/active`, `routine/[id]`) mount a LOCAL `BottomSheetModalProvider` — the
  root portal renders BEHIND native modals on iOS. Deliberate `Modal` exceptions
  (do not migrate): `AchievementUnlockModal`, `WorkoutResultsModal`, FeedItem's
  centered confirm-delete, `ReactionPicker` popover. Shared pickers:
  `ExercisePickerSheet` (search + muscle chips; `onlyIds`/`excludeIds`) and
  `comments/CommentSheetView` (thin containers `CommentSheet`/`EventCommentSheet`
  inject queries).
- **Charts:** built on `react-native-gifted-charts` (`TimeSeriesChart` = LineChart
  with long-press tooltip via `pointerConfig`; Progress activity bars = BarChart).
  Don't hand-roll new SVG charts. Known accepted divergence: gifted spaces points
  by index, not proportionally to timestamps.
- **Icons:** ALL icons go through the `src/components/Icon.tsx` facade (`<Icon name=...>`),
  which maps `IconName` to `lucide-react-native` via an internal registry (per-icon
  strokeWidth; `filled` → lucide `fill`). Never import lucide outside the facade and
  never hand-roll new SVG icons. Custom SVGs kept inside the facade: `scale` (no lucide
  equivalent) and `instagram` (lucide removed brand icons). Deliberate exceptions
  outside: `BicepIcon` (two-tone feed reaction), OAuth logos in `auth/OAuthButtons.tsx`,
  and progress rings (`StreakRing`/`RestRing`/`PasswordChecklist` — not icons).
  `TabIcon` is a thin wrapper over the facade. `barbell` stays in the union — used
  by name in `achievements.ts` strength tracks.
- **Plate calculator** (`src/lib/plates.ts` + `workout/PlateCalculatorSheet.tsx`): shown
  in LogPhase only for `equipment === 'barbell' | 'smith'`; math runs in display units
  (greedy per-side). `PLATE_COLORS` (real IWF plate colors) is a documented domain
  exception to the tokens-only rule — don't "fix" it.
- **Weekly muscle heatmap** (`WeeklyMuscleHeatmapCard` in Progress): real trained sets
  via `weeklySetsByMuscle` in `optimizationScore.ts` (current week, Monday cutoff — same
  convention as `achievements.ts`; completed non-warmup sets, primary 1 / secondary 0.5).
  Fixed weekly period — deliberately NOT wired to the 7d/30d/90d selector. Renders through
  the existing `MuscleMap` wrapper (`full_body` has no body-highlighter slug and is omitted).
- **Press feedback:** use `src/components/ui/PressableScale.tsx` (Reanimated spring
  scale + optional haptic) instead of bare `Pressable` for tappable cards/icons.
  `Button` has its own built-in effect — don't wrap it. List items in the training
  section animate with `FadeInDown` (stagger capped at `Math.min(i, 8)`) +
  `LinearTransition`; never put `entering`/`layout` on FlashList items (recycler crash).
- New IDs: `uuidv4()` from `src/lib/ids.ts`.
- Workout save (`repos/workouts.ts`) is idempotent — duplicate-key (`23505`) is
  swallowed, and `ensureWorkoutSynced` checks existence before insert. Preserve this
  when touching the publish/sync path.

## MCP
- If we have made any change on the Supabase data base, the supabase-fullstack-engineer agent needs to complete the changes

## End
- Update the claude.md and skills each time after completing every request to not loose the context