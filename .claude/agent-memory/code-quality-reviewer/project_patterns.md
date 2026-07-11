---
name: project-patterns
description: Architecture patterns, optimistic update conventions, and recurring anti-patterns in the Gmo Training App
metadata:
  type: project
---

## Optimistic update pattern (TanStack Query)
- onMutate: cancel queries, snapshot prev, patch cache, return context
- onError: restore from context snapshot (reverts query cache only)
- onSettled: invalidate (no refetch on sensitive lists to avoid scroll reset)
- **Critical gap**: frozen local state in connections.tsx is NOT covered by onError rollbacks — it diverges from the global cache on mutation failure. See [[frozen-divergence-bug]].

## Frozen list pattern (connections.tsx)
- First-load data is frozen into local state to prevent rows disappearing on unfollow (Instagram style)
- handleFollowChange patches `isFollowing` on frozen rows optimistically
- handleRefresh clears frozen + refetches
- Bug: `frozen` is never reset when `type` (followers/following) or `targetUsername` changes while the component stays mounted (e.g. param change via router). [[frozen-stale-on-param-change]]

## ExercisePickerModal dropdown
- `groupOpen` state is never reset to false when the modal is hidden (visible=false) and re-shown — it can open with the dropdown already expanded
- No zIndex issues for inline dropdown since it sits above ScrollView in the tree

## FeedItem ActionButton
- `label` is now `''` (empty string) when no reaction is active — component conditionally omits the Text node, which is correct
- The reaction button's emoji fallback '👊' is always rendered, so the button never collapses to zero width — layout is stable

## Redesign: Button 3D chunky pattern (added 2026-06-09)
- Button has chunky 3D mode for md/lg sizes when variant has `edgeColor` (primary, accent, secondary, danger). Ghost never chunky. Use `flat` prop to disable.
- Chunky Pressable wraps: `{ paddingBottom: depth.edge }` + absolute `edge` View + `face` View that translateY on press.
- `style` prop is applied to the outer Pressable, NOT the face — callers using `style={{ flex: 1 }}` will flex the Pressable container but the face won't stretch unless it has `alignSelf: stretch` or `flex: 1` internally. This is a known hitbox/layout quirk.
- depth token: `{ edge: 4, edgeLg: 5, pressTravel: 4 }`.

## Redesign: Workout session components (added 2026-06-09)
- Phase machine: warmup → set → log → rest → (loop) → summary
- `getNextPosition()` is a pure replica of `advancePosition()` logic. Must stay in sync.
- `swapExercise(exIdx, newId)` returns new index (may shift if completed sets exist). `handleSwapSelect` uses the returned index correctly.
- `playSplash(phrase)`: extracted helper, closes over stable Animated.Value refs — safe.
- RestRing: strokeDashoffset uses `useNativeDriver: false` — correct, SVG props not supported by native driver.
- SetProgressPills: Animated.loop with `loop.stop()` cleanup — no leak.
- `usedExerciseIds` memoized off `active?.exercises` — stable reference pattern, correct.

## Instagram: OAuth removed, manual only (updated 2026-06-12)
- OAuth client flow (`linkInstagram`, `handleLink`, `handleUnlink`, deep-link `useEffect`, `useLocalSearchParams` for `ig_status`) fully deleted from `app/profile/edit.tsx`
- `src/lib/instagram.ts` deleted; no remaining imports anywhere
- Only remaining client surface: manual `instagram_username` input in `edit.tsx`, display in `profile.tsx` and `profile/[username].tsx` via `openInstagram` from `src/lib/linking.ts`
- `instagramVerified` field still lives in types/store/repos (read from DB) but no badge is shown; field is kept for data compatibility with existing rows
- Trigger `protect_instagram_verification` on `public.profiles` still active (migration 0039) — blocks client writes to `instagram_verified`, `instagram_user_id`, `instagram_linked_at`
- `toDb()` in `src/lib/repos/profile.ts` still correctly omits all three protected columns
- Edge function `instagram_oauth` still deployed but inert (no client entry point)
- `expo-web-browser` still in `package.json` — harmless leftover, used by edge function deploy notes only

## Redesign: Known issues found in 2026-06-09 review
- Button chunky: `fullWidth` uses `alignSelf: stretch` on the Pressable but face View has no matching width — face won't stretch to full width. Should add `width: '100%'` or `alignSelf: 'stretch'` to the face.
- RestPhase pills: `pillsCurrent` when `next` is null uses `currentSetIdx` (0-based, the just-completed set). But SetProgressPills treats `current` as the active-but-not-done index. On the last set, pills show the last set as "current/pulsing" instead of all filled — minor visual inaccuracy.
- `playSplash` is defined inside the component body as a plain function (not useCallback) — it is recreated every render. Called only from a useEffect and an event handler, not from render, so no re-render cascade; however the phase-change useEffect has `// eslint-disable-next-line react-hooks/exhaustive-deps` suppressing the `playSplash` dep — intentional to avoid re-running on every render, but creates a stale closure risk if `playSplash` ever reads render-cycle state.
- SwapExerciseModal: image thumbnail inline (not extracted to ExerciseThumb) — minor duplication.
- `interval` variable in PrCarousel autoplay useEffect dep array: recalculated every render based on screenWidth; stable in practice but causes a new setInterval registration on every resize event (landscape flip). Low risk on mobile.

## Achievements system (added 2026-06-12)
- Motor puro en `src/lib/achievements.ts`: catálogo ACHIEVEMENTS, evaluateTrack, evaluateAchievements, unlockedTierIds, groupByCategory, lookupTier. Todo derivado del historial local + streakWeeks — fully offline.
- Store persistido en `src/store/achievements.ts` (AsyncStorage 'gmo:achievements:v1'): unlocked Record<tierId, ISO date>, seeded flag. sync() es síncrono (no async), persiste via fire-and-forget.
- Known bug: Animated.sequence in AchievementUnlockModal never stopped on unmount/index-change — can fire callbacks after component unmounts. Fix: store .start() return value and call .stop() in useEffect cleanup.
- Known issue: weekIndex() uses UTC epoch arithmetic (floor(ms/86400000)), not local calendar. On UTC-N timezones, midnight train logs before UTC day-change assign to yesterday's week. Low impact (gym hours rarely cross UTC midnight for US/EU users), but not locale-correct.
- Known issue: achievements tab in profile.tsx calls evaluateAchievements() in useMemo, but earnedLevels/totalLevels are re-computed inline without memoization — two separate reduce passes on the same array. Minor; consolidate if profile screen grows.
- persist() in achievements store snapshots state at call time but is called immediately after set() — correct ordering confirmed.
- seeded flag: backfill logic in _layout.tsx reads seeded AFTER Promise.all hydration — correct; race-safe because all stores hydrate before the seeded check runs.
