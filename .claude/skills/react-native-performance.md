---
name: react-native-performance
description: Prevent and diagnose React Native performance regressions in GMO Training. Use for FlashList, rendering, Reanimated, images, startup, bundle size, memory, query behavior, or slow Expo screens.
---

# React Native performance

Target Expo SDK 54, React Native 0.81, React 19, Reanimated 4, and Expo Go unless a native build is explicitly required.

## Measure

- Define path and metric before optimizing: startup, JS/UI frames, renders, list throughput, image memory, network, or bundle.
- Compare the same state and dataset before and after.

## Render

- Keep one virtualized vertical root for long screens. Use FlashList for large repeated collections.
- Never nest a same-direction ScrollView around FlashList.
- Keep row identity stable and subscriptions narrow.
- Preserve cached content during refetch; paginate feeds without resetting scroll.
- Move expensive pure derivation outside render.
- Defer full workout snapshot serialization into the persistence queue.

## Images and motion

- Use `expo-image` and correctly sized bundled assets.
- Keep exercise thumbnails local and follow `gmo-mobile-assets`.
- Prefer transform and opacity animation.
- Never attach `entering` or `layout` to FlashList items.
- Stop invisible timers, loops, and subscriptions.
- Feed refresh moves one overlay indicator, not the list.

## Startup and dependencies

- Preserve auth/profile timeouts.
- Avoid duplicate hydration and duplicate fetches.
- Reject dependencies whose benefit does not justify bundle, native and maintenance cost.
- Confirm Expo Go support before promising Expo Go verification.

## Verify

- Run tests, typecheck and lint.
- Exercise cold start, lifecycle, long/image-heavy feed, active workout, sheets and rapid navigation.
- Report measured evidence and remaining physical risk.
