---
name: mobile-visual-qa
description: Verify GMO Training native UI visually and interactively. Use after mobile screen, component, theme, asset, typography, motion, responsive, or accessibility changes and for visual regression audits.
---

# Mobile visual QA

## Build a state matrix

- List screens, entry paths, platforms, viewport classes and interaction states.
- Include loading, cached refetch, empty, populated, error, offline, disabled, keyboard, sheets, long copy, large text and reduced motion.
- Include missing images, extreme values and restricted privacy states.

## Inspect

- Run Expo Go on Android and iOS when available.
- Capture comparable screenshots with stable seed data and viewport.
- Check hierarchy, spacing, tokens, safe areas, clipping, keyboard, scroll and targets.
- Check image crop, aspect ratio, transparency, placeholder and fallback.
- Check modal focus, back behavior, confirmation and lifecycle.
- Look for recycler corruption, delayed taps and stale overlays.

## C3 regression matrix

- Render all nine rank emblems; invalid metadata and downshifts stay neutral.
- Compare vertical refresh with horizontal PagerView swipes; the list stays fixed.
- Exercise calendar, ledgers, milestone evidence, muscle sheet and keyboard.
- Repeat numeric +/−, comma typing, save, exercise changes and lifecycle.
- Inspect compact profile at 360/390/430/768, large text, screen reader and Reduce Motion.

## Compare

- Use `gmo-mobile-product-design`, `mobile-visual-accessibility`,
  `gmo-motion-language`, `gmo-domain-guardrails` and `gmo-mobile-assets`.

## Report

- Record defect, platform, state, reproduction, expected, actual and severity.
- Do not approve from code inspection alone; state unavailable device coverage.
