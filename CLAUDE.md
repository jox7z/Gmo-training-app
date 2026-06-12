# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gmo Training — a Strava-inspired gym training app: workouts, weekly streaks, a ranked
points system, AI coach, and a social feed. Expo (managed) + React Native + Supabase.
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
supabase functions deploy coach          # or generate_routine
supabase secrets set GEMINI_API_KEY=... ANTHROPIC_API_KEY=... OPENAI_API_KEY=...
# Migrations live in supabase/migrations/ (0001..00NN) and apply in numeric order.
```
## Subagents
- Always after creating the plan for any feature or change, use the agent of fullstack-supabase. After completing all the process always check with the code-reviewer agent

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
- `coach/` — AI coach with response cache (SHA-256 hash, ~7-day TTL), per-user rate
  limit (30/h), an in-memory per-provider circuit breaker, and provider fallback
  **Gemini → Anthropic (Claude) → OpenAI**; logs to `ai_usage_log`.
- `generate_routine/` — AI routine generation (pairs with the offline heuristic in
  `src/lib/routineGenerator.ts`).
- `instagram_oauth/` — verified Instagram linking via "Instagram API with Instagram
  Login" (Business/Creator accounts only; Meta killed OAuth for personal accounts).
  Deploy with `--no-verify-jwt`: the GET `/callback` is public (browser redirect,
  no JWT) and always 302s back to `gmo://profile/edit?ig_status=...`. Secrets:
  `IG_APP_ID`, `IG_APP_SECRET`, `IG_STATE_SECRET` (HMAC for the OAuth `state`).

## Domain rules to respect

- **Weight unit:** the DB always stores **kg**; display converts to the user's unit.
  Use `src/lib/units.ts` `formatWeight` for *exercise set* weights (treats `<= 0` as
  bodyweight → "Peso corporal"); use the separate `formatWeight` in `src/lib/progress.ts`
  for *body-weight* tracking. They are not interchangeable.
- **Ranks** are defined in `src/theme/tokens.ts` (9 tiers: rookie, bronze, silver, gold,
  platinum, diamond, elite, titan, olympus, with `min` point thresholds). `tokens.ts` is
  authoritative — the README's thresholds are outdated. `migrateProfile` in `app.ts`
  remaps the legacy `legend` rank to `olympus`.
- **Muscle optimization** uses fractional set counting: a primary muscle gets 1 set per
  working set, each `secondary` muscle gets 0.5. See `Exercise` in `src/data/exercises.ts`
  and `src/lib/optimizationScore.ts`.
- **Instagram verification:** `profiles.instagram_verified`/`instagram_user_id` are
  written **only** by the `instagram_oauth` edge function (service role). The trigger
  `protect_instagram_verification` (migration 0039) blocks any client write and
  auto-degrades to unverified when `instagram_username` changes — that *is* the
  client-side unlink mechanism. Never add these columns to `toDb()` in
  `src/lib/repos/profile.ts`. Manual usernames remain allowed but unverified.
- **Exercise images** are bundled (not remote) in `assets/exercises/<id>.webp`, generated
  by `scripts/fetch-exercise-images.mjs` (public-domain source) so the picker works
  offline. Regenerate via that script rather than hand-adding files.

## Conventions

- All UI colors/spacing/radii/ranks come from `src/theme/tokens.ts`; reusable UI
  primitives are in `src/components/ui/`. The app is dark-mode only.
- New IDs: `uuidv4()` from `src/lib/ids.ts`.
- Workout save (`repos/workouts.ts`) is idempotent — duplicate-key (`23505`) is
  swallowed, and `ensureWorkoutSynced` checks existence before insert. Preserve this
  when touching the publish/sync path.

## End
- Update the claude.md and skills each time after completing every request to not loose the context