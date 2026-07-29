---
name: gmo-motion-language
description: Design or implement GMO Training native motion and feedback. Use for Reanimated transitions, gestures, press feedback, list entrances, modals, celebrations, timers, and reduced-motion behavior.
---

# GMO motion language

Target Reanimated 4 in Expo SDK 54 and preserve Expo Go compatibility. Motion
must explain state, preserve continuity, or confirm direct manipulation.

## Language

- **Take every duration, curve and spring from `src/theme/motion.ts`.** Never inline a magic `damping`/`stiffness`/`duration`. Declarative animation uses `enter()` / `exit()` / `layoutTransition()`; imperative animation uses `useMotion()`.
- Prefer Reanimated 4 over the legacy `Animated` API from react-native, including when editing a file that still uses it.
- Make everyday motion quick, weighted, and controlled. Reserve spectacle for earned rank or achievement moments.
- Use spring scale through `PressableScale` for tappable cards and icons. Do not wrap `Button`; it owns its feedback.
- Animate transforms and opacity first. Avoid layout-heavy animation when a compositor-friendly alternative exists.
- Keep entrances directional and tied to hierarchy. Avoid unrelated elements moving at once.
- Use haptics only for meaningful commits, milestones, and destructive confirmations; never for passive motion.
- Let timers and progress indicators communicate elapsed state without continuous decorative motion.

## Lists and navigation

- Use `FadeInDown` with stagger capped at `Math.min(index, 8)` and `LinearTransition` for supported training lists.
- Never attach `entering` or `layout` to FlashList items; recycler reuse can crash or visually corrupt rows.
- Pull-to-refresh may animate an overlay indicator, never the Feed FlashList.
  Gate activation manually by direction dominance and fail when horizontal intent
  belongs to `PagerView`, including diagonals that change dominance.
- Keep shared continuity across sheets, modals, and navigation without delaying the user's next action.
- Cancel or replace obsolete animation when state changes rapidly. Never queue stale confirmations.

## Reduce Motion

- Detect the platform preference and deliver the same information with static state changes.
- Treat the initial unknown preference as reduced; enable motion only after the
  system explicitly permits it. This applies to **imperative** motion via
  `useMotion()`. Declarative `entering`/`exiting`/`layout` must NOT be gated on
  `useReduceMotion()` — it starts `true` and resolves async, which would swallow
  the first frame of every cold start. Chain `ReduceMotion.System` instead, which
  is what the `motion.ts` helpers already do.
- Stop skeleton pulses and decorative loops. Remove parallax, repeated bounce, and large spatial travel.
- Active-workout phase transitions, the finite `RestMascotCoach` entrance,
  summary entrances, routine-editor entrances and PR autoplay must become static.
  Set splashes, rotating rest phrases, pulsing progress and PR glow are retired.
- Keep essential progress and completion feedback perceivable without depending on animation.

## Verify

- Test interrupted gestures, rapid taps, navigation during animation, background/foreground, long lists, and reduced motion.
- Check Android and iOS in Expo Go. Profile frame stability when motion shares the screen with images, charts, or FlashList.
- Coordinate performance thresholds with `react-native-performance` and rendered review with `mobile-visual-qa`.
