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
npm test             # jest (preset jest-expo) — pure-lib suites in src/lib/__tests__/
```

"Verifying" a change means `npm run typecheck` + `npm run lint` + `npm test`, and
exercising it in Expo Go. Jest config lives in the `"jest"` block of `package.json`
(NOT a jest.config.js — a root .js file would hit eslint-config-expo's `no-undef`):
preset `jest-expo`, `moduleNameMapper` for the `@/*` alias, `testMatch` restricted to
`**/__tests__/**/*.test.ts?(x)` so shared fixtures (`src/lib/__tests__/fixtures.ts`)
don't run as suites. Tests cover **pure lib only** (units, oneRepMax, plates,
workoutCompare, optimizationScore, achievements, exerciseProgress) — no RN Testing
Library yet; components/stores/repos are untested by design for now. In fixtures use
`import type` for store types so suites don't drag AsyncStorage into the runtime.

**Component/store testing infra (added, not yet used by any suite):**
`@testing-library/react-native@^14` (async API — `await render(...)`, `await
fireEvent...`, `await act(...)` in any new RNTL test) + `test-renderer@1.1` (the
React-19-compatible renderer RNTL v14 needs; NOT `react-test-renderer`, deprecated
under React 19) are devDependencies. Root `jest.setup.ts` (`.ts`, not `.js`, for the
same `no-undef` reason as jest.config) wires the official
`@react-native-async-storage/async-storage/jest/async-storage-mock` via
`jest.mock(...)`, referenced from `"setupFiles"` (not `"setupFilesAfterEnv"` —
mocking a native module needs to be in place before any module-load-time import of
AsyncStorage; `setupFilesAfterEnv` runs after the test framework installs and is for
`expect.extend`/global `beforeEach` instead). RNTL's custom matchers ship built-in
since v12.4 — don't add `@testing-library/jest-native` (deprecated).

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
  Native `AppState` via `focusManager`, and **online state to NetInfo via
  `onlineManager`** (without it RN assumes always-online and `refetchOnReconnect`
  never fires). Network policy (deliberate, don't "fix" piecemeal): `networkMode:
  'offlineFirst'` on queries AND mutations, with `retry: 0` on queries — under
  offlineFirst the FIRST attempt always runs (fails fast offline → `isError`
  renders `ErrorState`), but a RETRY requires `onlineManager.isOnline()` and would
  leave the query `paused` (neither loading nor error → false empty screen).
  Recovery comes from `refetchOnReconnect` + `refetchOnWindowFocus`.

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
- `generate_routine/` — AI routine generation edge function. **No client entry point
  found**: no `callEdgeFunction('generate_routine', ...)` call site in `app/` or `src/`.
  The client-side offline heuristic it used to pair with (`src/lib/routineGenerator.ts`)
  was dead code (no call sites either) and was removed; routine templates now come from
  `src/data/routineTemplates.ts` (`famousRoutineOptions`) instead. Treat this function as
  legacy like `instagram_oauth/` until re-wired. The provider secrets stayed
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
- **Supersets/trisets/circuitos (2-4 miembros)** — members share a `supersetGroupId`
  (uuid) and MUST stay **contiguous** in `RoutineDay.exercises` / `Workout.exercises`.
  `MAX_GROUP_SIZE = 4` in `app/routine/[id].tsx`. Contiguity is not just a count check:
  `src/lib/supersets.ts` `dissolveNonContiguousGroups` (generic, reused by the routine
  editor's `groupSelected`/`removeExercise` AND by `swapExercise` in
  `src/store/workouts.ts`) scans **contiguous runs** and clears `supersetGroupId` on any
  run shorter than 2 — a plain "does this id appear ≥2 times anywhere" count is NOT
  enough, because re-grouping a subset of an existing 3+ group, or swapping a MIDDLE
  member live, can leave two same-id items with a valid count but no longer adjacent
  (found by `code-quality-reviewer` on the trisets/circuitos pass, fixed by moving this
  from a local per-file count-based helper to the shared contiguity-based one).
  The active-workout advance machine is a precomputed step sequence,
  `src/lib/supersets.ts` `buildStepSequence` (pure, testable, `supersets.test.ts`): it
  interleaves group rounds A1→B1→C1→A2→B2→C2… and marks `closesRound`. Inside a group,
  each member does its OWN `isWarmup` sets first (in member order, normal rest each),
  and only once every member is done warming up does the round-robin over the
  non-warmup sets start — `setIdx` in a work-phase step is the REAL index into `sets[]`
  (not a round number), since warm-ups prepended to the front shift it. This is why
  `canAddWarmup` in `app/workout/active.tsx` gates on **the whole group having zero
  progress**, not just the current exercise (`groupHasProgress`, checks
  `active.exercises` for ANY member of the same group with a completed set): adding a
  warm-up recomputes `steps` from scratch, and since ALL warm-up steps of ALL members
  sort before ANY work step, doing this after the group's round-robin has already
  started re-sorts already-completed steps to a later position — the user gets walked
  back onto a set they already logged. Found via manual trace during the
  trisets/warm-ups-in-superset review, fixed before merge (not a theoretical risk — the
  default 2-member case triggers it: complete A1, land on B with 0 progress, add
  warm-up to B). In `app/workout/active.tsx`, `steps` is a `useMemo` keyed by **shape**
  (`supersetGroupId + sets.length` per exercise, NOT `active` — same reason as
  `prevSets`). `getNextPosition`/`advancePosition`/`isLastSet`/`nextLabel` all derive
  from `steps`. Rest rule: `handleLogSave` skips rest (no `captureRest`,
  `restAfterSeconds` stays undefined) when the closed set does NOT close its round — it
  jumps straight to the next member. Weight/reps preload only when the next step is the
  **same** exercise (`next.exIdx === exIdx`), never across a group partner. `swapExercise`
  inherits `cur.supersetGroupId` so the replacement stays in-group, clears it on the
  completed remainder, and runs the whole result through `dissolveNonContiguousGroups`
  (needed for swaps on a MIDDLE member of a 3-4 group, which otherwise splits one
  contiguous run into two same-id-but-non-adjacent pieces).
  `partnerExercises: WorkoutExercise[]` (filter, not find) feeds `SupersetBadge`, which
  takes `partnerNames: string[]` and labels via `supersetLabel(size)`
  (2→"Superset", 3→"Triset", 4→"Circuito"); the joined name list caps at 2 names
  ("X, Y y N más") to avoid an unbounded `Chip` with a 4-member circuit.
  DB: `superset_group_id uuid null` on `routine_day_exercises` + `workout_exercises`
  (migration `0049_supersets.sql`, applied to remote, partial indexes, RLS unchanged —
  covered by parent join; `get_advisors` clean except expected INFO "unused_index" with
  no grouped data yet — no further migration needed for 3-4 member groups, the column
  already allows any number of rows sharing a uuid). `group_rest_enabled boolean not
  null default false` (migration `0050_superset_group_rest.sql`, applied to remote)
  is the SAME kind of per-member-redundant flag as `supersetGroupId` — never a
  separate "group" table.
  **Intra-group rest is measured, never prescribed**: `groupRestEnabled` (opt-in per
  group, default off = classic superset skip) makes `buildStepSequence` force
  `closesRound: true` on every work-phase step of that group instead of only the
  round's last member — this reuses the EXISTING self-paced `RestPhase`
  (`captureRest`/`handleRestConfirm` in `active.tsx`, untouched) which has no imposed
  countdown/target; it only measures `restAfterSeconds`. No standardized rest value is
  ever suggested — that was an explicit product requirement, not an oversight.
  Toggled per group via the (now pressable) label chip between members in
  `app/routine/[id].tsx` (`toggleGroupRest`, sets an EXPLICIT shared value on ALL
  members — never negates each member's own value, which would let a
  divergent group get MORE divergent instead of converging).
  **Group homogeneity invariant**: every member of a group must share the same
  `groupRestEnabled` (`buildStepSequence` only reads it from `groupIdxs[0]`, the first
  member of the run, but the UI chip displays whichever member's card triggered
  `prevSameGroup`, typically NOT the first — a mismatch is invisible in the algorithm
  but visibly wrong in the UI). Every mutation site must keep this true:
  `dissolveNonContiguousGroups` clears `groupRestEnabled` (not just `supersetGroupId`)
  on any run it dissolves; `groupSelected` resets it to `false` explicit on newly
  formed groups (never inherits a stale value from a member's PREVIOUS group
  membership); `swapExercise`'s completed remainder clears it alongside
  `supersetGroupId`. Membership editing (`app/routine/[id].tsx`) is now granular
  instead of all-or-nothing: `removeFromGroup(exId)` drops just that member (auto-
  dissolves the rest if <2 remain — reproduces the old full-ungroup behavior for pairs
  for free) and `addToGroup` (the "+" button on a sub-cap group's last member, reusing
  the same `ExercisePickerSheet` via `addToGroupTarget` + `handlePickerSelect`) inserts
  a new member right after the group's last member, inheriting its `groupRestEnabled`.
  Both the routine editor's initial load and `active.tsx`'s `handleWarmupDone` run
  `dissolveNonContiguousGroups` defensively on load/session-start, in case any routine
  persisted before these invariant fixes existed still carries a non-contiguous
  `supersetGroupId`.
  `WorkoutHeader`'s segment bar gets a thin bracket line under contiguous
  same-`groupId` runs (`computeGroupBrackets`, percentage-positioned, doesn't account
  for the 4px inter-segment gap — decorative approximation, not exact).
  **Drag & drop** (`app/routine/[id].tsx`, `react-native-reorderable-list@0.18.1`,
  Tier 1 Expo Go — see `docs/memory/visual-stack.md`): `NestedReorderableList` inside
  `ScrollViewContainer` (drop-in replacement for the form's outer `ScrollView`, one
  shared scroll, `scrollable={false}` on the list cedes scrolling to the parent).
  Card extracted to `ExerciseRow` because `useReorderableDrag()` only works inside the
  list's own cell; dedicated `grip` handle (left edge, `onLongPress={drag}`) is the
  ONLY draggable trigger — never the whole card, which still needs normal taps on its
  steppers/buttons — and is hidden together with `dragEnabled={!groupMode}` while in
  group-select mode. Row `entering`/`layout` Reanimated props were removed (the
  library's own cell animation owns the transform now). `handleReorder` always pipes
  the result through `dissolveNonContiguousGroups` — a drag that splits a member away
  from its group dissolves it silently, no confirm (same no-confirm precedent as
  `removeExercise`/`removeFromGroup`).
  **`dissolveNonContiguousGroups` gained a second invariant check because of drag**:
  before, it only cleared a run shorter than 2 — but dragging an unrelated exercise
  into the exact MIDDLE of a group (e.g. a 4-member circuit) splits it into two
  disjoint runs that EACH still measure ≥2 (survive the length check) while still
  sharing the same `supersetGroupId` — no prior mutation path (group/ungroup/swap)
  could produce two disjoint runs of a shared id, only drag can. `buildStepSequence`
  itself was unaffected (it re-scans contiguity from scratch, so it already treated
  the two runs as independent groups regardless of id) — but `toggleGroupRest`/
  `groupSizes`/`canAddToGroup`/the chip label all match by id VALUE, not contiguity,
  so they silently coupled two groups the user sees as separate. Fixed: the function
  now tracks a `Set` of already-closed group ids and reassigns a fresh `uuidv4()` to
  any later run (length ≥2) that reuses one.
  With this the supersets/trisets/circuitos system's 6 originally-deferred items are
  all closed — **nothing left deferred** in this area besides the deliberate product
  decision to never offer a prescribed/standardized rest duration.
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
- **OAuth (Apple/Google) login** (`src/lib/auth/oauth.ts`, `src/components/auth/OAuthButtons.tsx`)
  is **web-based**, not native SDKs: `supabase.auth.signInWithOAuth()` +
  `expo-web-browser`'s `WebBrowser.openAuthSessionAsync` opens the consent screen in an
  embedded browser and returns the redirect URL directly — no
  `expo-apple-authentication`/`@react-native-google-signin` (both require a dev build;
  the app still targets Expo Go). This is real OAuth against Supabase's
  `auth.users`/`auth.identities`, just with a browser hop instead of a native
  bottom-sheet. The Supabase client (`src/lib/supabase.ts`) sets `flowType: 'pkce'`
  (needed on top of the pre-existing `detectSessionInUrl: false` — with the default
  `'implicit'` flow the redirect returns tokens in the fragment and
  `exchangeCodeForSession` wouldn't apply), so the code→session exchange is **manual**:
  `signInWithOAuth` in `oauth.ts` parses `code`/`error`/`error_description` out of the
  redirect via `Linking.parse`, then calls `exchangeCodeForSession`. It also polyfills
  `crypto.getRandomValues` from `expo-crypto` (only if missing — never clobbers an
  existing one) because Hermes has no global `crypto`, which supabase-js needs to
  generate the PKCE verifier; without it supabase-js silently falls back to a
  `Math.random`-based verifier. `WebBrowser` result types `cancel`/`dismiss`/`locked`
  are a silent no-op, not an error. Post-login is **provider-agnostic already** —
  `app/_layout.tsx`'s `onAuthStateChange` listener redirects by `is_profile_complete`
  regardless of how the user signed in, so nothing there changes for OAuth. No
  `authProvider` field was added to `profiles`/`UserProfile` — Supabase already tracks
  it server-side in `auth.identities`/`app_metadata` and no UI needs to show it.
  Activating this for real requires the user to complete Google Cloud Console + Apple
  Developer (paid) + paste credentials into the Supabase Dashboard — until then, tapping
  a button surfaces a humanized "provider is not enabled" error (`humanizeAuthError`),
  not a crash. **Expo Go cannot reliably complete the redirect leg** (confirmed against
  Expo's own docs + a known `supabase/auth` issue: `Linking.createURL` in Expo Go
  returns a dynamic `exp://<lan-ip>:<port>/...` URL that Supabase's redirect allow-list
  doesn't match reliably, even with wildcards — don't try to "fix" this by adding
  `exp://` wildcard entries to `supabase/config.toml`, it's a documented dead end).
  `signInWithOAuth` guards against this explicitly (`Constants.executionEnvironment ===
  ExecutionEnvironment.StoreClient` from `expo-constants`) and throws a clear Spanish
  error asking for a development build, instead of letting the browser open and fail as
  a silent "cancel". End-to-end verification is deliberately deferred until the app
  jumps to a development build (same jump already planned for push notifications) —
  this doesn't block the feature being code-complete. `access_denied` (user declines
  the provider's consent screen) is treated the same as closing the browser (silent,
  not an error); any other provider error surfaces a fixed generic Spanish message
  (`OAUTH_GENERIC_ERROR`) rather than passing the raw, often-English OAuth2 error code
  through `humanizeAuthError` (that table is shaped for GoTrueError objects, not raw
  query-param error codes). `WebBrowser.maybeCompleteAuthSession()` is called at module
  load in `oauth.ts` — required for the web target (`npm run web`) or the popup never
  auto-closes. `app/auth/callback.tsx` (registered in `_layout.tsx`) is a fallback
  route, not the happy path — normally `openAuthSessionAsync` intercepts the redirect
  before it ever reaches the router; the route exists only for the case where it
  doesn't (e.g. Android kills the process mid-browser-hop and the code comes back as a
  cold-start deep link instead), so it doesn't get silently dropped on Expo Router's
  unmatched-route screen. It reuses `exchangeOAuthCode` (extracted out of
  `signInWithOAuth` in `oauth.ts`) and deliberately does **not** navigate on success —
  `_layout.tsx`'s existing `onAuthStateChange` + gating effect already does that the
  moment the session appears, so duplicating it here would race it. `OAuthButtons`
  exposes `onBusyChange` (fires whenever its internal in-flight state changes, including
  the window after the browser closes while `exchangeCodeForSession` is still in
  flight) — `login.tsx`/`signup.tsx` fold it into their own `canSubmit`, so the
  email/password submit button can't be tapped concurrently with an in-flight OAuth
  exchange.
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
- **Score de optimización de rutina:** `src/components/routines/RoutineScoreCard.tsx` es LA card
  del score (círculo + barras de breakdown + grupos débiles) — presentación pura sobre un
  `RoutineScore` ya calculado, sin stores ni Supabase. La consumen la pestaña Rutina
  (`app/(tabs)/routines.tsx`, rutina guardada) y el editor (`app/routine/[id].tsx`, borrador en
  memoria vía `useMemo(() => computeRoutineScore(routine, profile))` — el estado local del editor
  YA es un `Routine` completo, no hay que reconstruir shape). Cálculo 100% local (solo
  `profile.weeklyGoalDays` + catálogo estático): nunca añadir query/RPC/migración para el score.
  No dupliques el JSX del círculo/barras por pantalla. El gate de "sin ejercicios todavía" usa
  `score.breakdown.coverage > 0`, NO `score.weakGroups.length > 0` — `weakGroups` es
  `MAJOR_GROUPS` ordenado y recortado a 2 (`src/lib/optimizationScore.ts`), así que SIEMPRE
  tiene longitud 2 sin importar el contenido de la rutina; ese chequeo era código muerto que
  mostraba "grupos más débiles" fabricados en una rutina vacía (hallazgo de
  `code-quality-reviewer`, corregido antes de commitear).
- **Leaderboard (rango vs. otros):** `src/components/social/LeaderboardRow.tsx` es LA fila
  compartida (posición vía `podiumColor()`, `Avatar`, nombre/username, puntos) — consumida por
  `app/discover.tsx` (tab "Ranking", global, siempre navegable a `/profile/[username]`) y por
  `app/(tabs)/progress.tsx` (sección "Leaderboard", con un `SegmentedControl` Mi rango/Global:
  Mi rango usa `useLeaderboard(rankId)` — query directa a `profiles` filtrada por
  `current_rank`, sin RPC — Global usa el mismo `useGlobalLeaderboard(50, enabled)` que
  `discover.tsx`, con `enabled` nuevo para no dispararla hasta que el usuario elija ese modo;
  mismo `queryKey`, así que la cache se comparte entre las dos pantallas). Navegabilidad = si
  se pasa `onPress` o no (no un flag booleano separado); `variant: 'card'|'list'` es la única
  diferencia de chrome real entre discover (cards sueltas) y progress (filas planas dentro de
  una card). No reimplementar esta fila por pantalla. RLS de `profiles` ya es lectura pública
  (`0001_init.sql`) — no hace falta ninguna migración para leer rango/puntos de otros usuarios.
- **Loading skeletons:** use the shared `src/components/ui/Skeleton.tsx` primitive
  (`Skeleton`, `SkeletonCircle`, `SkeletonRow`) for every load placeholder — never a
  bare `ActivityIndicator`/`Loader` on initial content load. It's a single Reanimated 4
  shimmer loop (LinearGradient sweep over `colors.bg.elevated`, band = `colors.bg.shimmer`)
  that honors `useReducedMotion`. Don't reintroduce classic `Animated.loop`/`new Animated.Value`
  for skeletons (`FeedSkeleton` is built on this primitive; `react-native-skeleton-placeholder`
  was rejected — its `react-native-linear-gradient` peer isn't in Expo Go). List skeletons
  only replace the *initial* empty/loading state, not pagination footers or inline search spinners.
- **Empty & error states:** every empty list/collection renders the shared
  `src/components/ui/EmptyState.tsx` (icon/title/subtitle, `action` +
  `secondaryAction`, tones, future `illustration` slot) and every query error
  renders `ErrorState` (thin wrapper, danger tone, "Reintentar" + `onRetry`) —
  never hand-roll per-screen empties or leave a screen blank/spinning on error.
  Empty states should carry a CTA where a next step exists (patrón Strong):
  e.g. "Empezar entreno" via `goToTab`, "Descubrir atletas", "Publicar".
  Distinguish `isError` (→ ErrorState with retry) from a genuine "not found" /
  empty result — an error must never degrade into a false "no existe" (see
  `app/profile/[username].tsx`, `app/events/[id].tsx`, `app/communities/[id].tsx`).
- **Remote images:** use `expo-image` (not RN `Image`) for network photos —
  `cachePolicy="memory-disk"`, `transition`, `backgroundColor: colors.bg.elevated`
  placeholder, and `recyclingKey` on FlashList items (see `FeedItem`, `Avatar`).
  Avatar keeps its initial-letter fallback only for falsy uri — no onError handling.
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
- **Frases motivacionales del workout activo:** `MotivationalPhrase({ phrases, style })`
  en `app/workout/active.tsx` es EL componente de frase rotativa (ciclo de 4500ms,
  entrada spring overshoot + slide-up, salida fade/shrink/slide-down, con la API
  `Animated` clásica de RN como el resto de ese archivo — no Reanimated). Se monta dos
  veces con arrays distintos: `REST_PHRASES` en `RestPhase` (tono de recuperación, con
  `style={{ marginTop: spacing.lg }}` porque ese contenedor no tiene `gap`) y
  `SET_MOTIVATION_PHRASES` en `SetPhase`, bajo el chip del cronómetro (tono de empuje,
  sin margin: el padre ya separa con `gap: spacing.lg`). Para añadir frases edita solo
  el array; no dupliques el componente ni metas el texto en la DB — es 100% local.
- New IDs: `uuidv4()` from `src/lib/ids.ts`.
- Workout save (`repos/workouts.ts`) is idempotent — duplicate-key (`23505`) is
  swallowed, and `ensureWorkoutSynced` checks existence before insert. Preserve this
  when touching the publish/sync path.

## MCP
- If we have made any change on the Supabase data base, the supabase-fullstack-engineer agent needs to complete the changes

## End
- Update the claude.md and skills each time after completing every request to not loose the context
- **Always update the roadmaps to track progress**: after completing any roadmap item
  (or partially completing one), mark it in `docs/roadmap.md` / `docs/roadmap-ui.md`
  with ✅ + date + a one-line note of what shipped (and what remains if partial), in
  the same style as the existing entries. A sprint is not done until the roadmap
  reflects it.