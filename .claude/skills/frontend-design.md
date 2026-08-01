---
name: frontend-design
description: Design and implement distinctive production web interfaces. Use only for browser-rendered HTML, CSS, JavaScript, React web, Vue, web artifacts, posters, or websites; do not use for React Native or Expo screens.
---

# Frontend design

## Route first

- Confirm the target renders in a browser with web layout and styling primitives.
- Use this skill for websites, web pages, browser components, HTML/CSS artifacts, and web posters.
- Do not apply web assumptions to Expo or React Native.
- Route native mobile work to `gmo-mobile-product-design`; add `gmo-motion-language`, `mobile-visual-accessibility`, `react-native-performance`, `mobile-visual-qa`, or `gmo-mobile-assets` as the task requires.

## Set a direction

- Identify purpose, audience, content hierarchy, technical constraints, and the one memorable visual idea.
- Choose a specific art direction. Name its typography, palette, composition, texture, and motion principles before implementation.
- Match complexity to intent. Use restraint for refined minimalism and sufficient craft for expressive systems.
- Extend an existing product language when one exists. Do not impose novelty that breaks product coherence.

## Implement

- Build functional, production-grade code. Cover responsive states, interaction states, empty/error/loading states, keyboard use, and reduced motion.
- Use semantic HTML and accessible names. Preserve logical focus order and visible focus.
- Centralize color, type, spacing, radius, shadow, and motion values with CSS variables or the project token system.
- Create deliberate hierarchy through typography, scale, rhythm, and contrast.
- Use atmosphere and detail only when they reinforce the concept. Keep effects performant and content legible.
- Prefer CSS motion for simple web interactions. Use the project's motion library only for orchestration that CSS cannot express cleanly.

## Avoid

- Reject interchangeable hero-card-feature grids, decorative dashboards, gratuitous glassmorphism, purple-on-white gradients, and context-free blobs.
- Reject arbitrary font choices, excessive type families, timid palettes, uniform card grids, and animation on every element.
- Do not add custom cursors, scroll hijacking, or essential hover-only behavior without a strong product reason.
- Do not substitute visual novelty for usable hierarchy, responsive behavior, or accessible interaction.

## Verify

- Test representative phone, tablet, and desktop widths.
- Check overflow, long copy, zoom, keyboard navigation, focus, contrast, loading, error, and reduced-motion behavior.
- Confirm the result looks intentional at first paint and remains usable without animation.
