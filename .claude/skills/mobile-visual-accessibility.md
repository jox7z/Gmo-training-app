---
name: mobile-visual-accessibility
description: Audit or implement visual accessibility for GMO Training React Native UI. Use for contrast, text scaling, touch targets, focus, screen-reader labels, reduced motion, charts, color semantics, and keyboard-safe layouts.
---

# Mobile visual accessibility

## Perceive

- Meet WCAG AA contrast for text and essential controls. Check disabled, pressed, error, and overlay states separately.
- Never encode rank, progress, status, privacy, error, or selection by color alone. Add text, icon, pattern, or shape.
- Keep charts understandable through labels, values, accessible summaries, and selectable points. Do not rely on gesture discovery.
- Give informative images useful accessible text. Mark decorative imagery inaccessible.

## Read

- Support system font scaling without clipping, overlap, hidden actions, or fixed-height truncation.
- Allow Spanish strings, long names, large numbers, and unit conversions to wrap safely.
- Preserve logical reading order. Do not use visual reordering that contradicts accessibility focus.

## Operate

- Keep every interactive target at least 44 × 44 points.
- Provide accessible role, name, state, value, and hint where the control is not self-describing.
- Keep destructive and privacy actions explicit. Do not use swipe or long press as the sole path.
- Manage focus when opening and closing modals or sheets.
- Keep forms and searchable sheets usable with the keyboard visible.
- Provide a visible, focusable refresh action in addition to pull gestures.
- Calendar future days remain legible with muted semantics; today has a non-color-only outline.

## Adapt

- Honor Reduce Motion according to `gmo-motion-language`.
- Treat the initial unknown motion preference as reduced.
- Do not depend on haptics, sound, or animation to communicate success or failure.
- Keep loading skeletons static under Reduce Motion.
- Test screen reader, large text, landscape, and small phones on both platforms.

## Report

- Cite screen, component, state, impact, remediation and verification.
- Separate blockers from enhancements.
