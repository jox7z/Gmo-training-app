---
name: gmo-mobile-product-design
description: Design or refactor GMO Training native mobile screens and components. Use for Expo Router, React Native layout, interaction hierarchy, forms, feeds, profiles, routines, progress, and navigation UI.
---

# GMO mobile product design

Target Expo SDK 54, React Native 0.81, React 19, Expo Router, and the **local development build** (`expo-dev-client` + Skia — the app no longer runs in Expo Go). Use native primitives; do not translate browser CSS patterns literally.

## Compose

- Start from the user task, dominant action, information hierarchy, and one-handed mobile context.
- Reuse the `src/components/ui/` barrel, tokens from `src/theme/tokens.ts` and timings from `src/theme/motion.ts`.
- Keep the app dark-only. Apply visual expression from `gmo-fitness-social-art-direction`.
- Use the Ember radius scale (`radius.xs` 4 … `radius.3xl` 36). The retired "nearly square 2–4 px" rule no longer applies. Use `radius.pill` for variable-width capsules and reserve `radius.full` for real circles.
- Take depth from `elevation` 0–3. Blur is chrome only (`glass.tabBar` / `glass.sheet` / `glass.header`); content cards never become translucent panels.
- Keep forms, controls, modals, selectable tiles, and state badges contained with complete borders.
- Use `Card variant="section"` for reading panels: square, top and bottom separators, no lateral border.
- Place the primary action where it remains reachable and unambiguous.
- Design explicit loading, empty, error, offline, disabled, success, and destructive-confirmation states.

## Select the right mobile pattern

- Keep social streams full viewport width on phones and centered at 600 points maximum on larger screens.
- Use `Card variant="stream"` only on public/social surfaces. Keep 8-point inter-post gaps, 16-point reading insets, and 4:5 full-bleed media.
- Keep forms, auth, routines, Progress, private history, settings, and modals contained.
- Keep public profile galleries at three columns, 1-point gaps, and no outer margin.
- Keep the personal profile on one FlashList root with sticky tabs. Do not nest vertical scroll views.
- Keep its identity header compact: shallow rank strip, 72-point overlapping
  avatar, social counters, one Edit action, and a three-dot Share/Settings menu.
- Keep bottom sheets geometrically stable when search or filters change; scroll only the result region.
- When a sheet contains search, elevate it above the keyboard and resize only its
  results. Never leave the last rows under the keyboard.
- Progress uses a fixed 6×7 month calendar and a searchable 12-muscle milestone
  selector; the body map is an optional shortcut, not the only selection path.
- Use skeletons only for an initial empty load. Preserve cached content during refetch.

## Interact

- Use `PressableScale` for tappable cards and icons. Use `Button` directly for button actions.
- Make icon-only actions self-evident and accessible. Prefer text labels for consequential actions.
- Preserve user input across transient errors, backgrounding, keyboard changes, and retries.
- Feed pull-to-refresh keeps content fixed; only the GMO indicator moves. Preserve
  a visible 44-point refresh action for keyboard and assistive input.
- Avoid hover assumptions, tiny inline actions, dense desktop toolbars, and decorative controls.
- Enforce target sizing, text scaling, semantics, and contrast through `mobile-visual-accessibility`.
- Coordinate motion through `gmo-motion-language` and performance through `react-native-performance`.

## Handoff

- Specify screen states, component reuse, navigation outcome, keyboard behavior, and platform differences.
- Keep product/business rules in `gmo-domain-guardrails`.
- Send new or changed image work through `gmo-mobile-assets`.
- Verify the rendered result through `mobile-visual-qa`.
