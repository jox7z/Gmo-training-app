---
name: gmo-mobile-assets
description: Create, select, optimize, replace, or audit GMO Training mobile image assets. Use for icons, splash, mascot, rank crests, exercise thumbnails, social imagery, file formats, asset reuse, and media licensing.
---

# GMO mobile assets

## Reuse identity

- `assets/brand/gmo-mark-master.png` is the cream/black/red robot master.
- `assets/icon.png` is the optimized runtime icon/splash source.
- `assets/brand/gmo-mark-transparent.png` is the alpha-safe runtime derivative
  for Feed refresh. Preserve its transparent outer canvas.
- Render the mascot only through `src/components/GmoMascot.tsx`.
- Preserve rank filenames and the static `RANK_IMAGES` map.
- Keep masters under `assets/brand/`; import optimized derivatives at runtime.
- Do not create per-screen copies or dynamic React Native `require()` paths.

## Exercise media

- Keep images bundled under `assets/exercises/<id>.webp`.
- Regenerate through `scripts/fetch-exercise-images.mjs`.
- Keep local IDs authoritative and use the dumbbell fallback.
- Never fetch exercise thumbnails remotely from UI.

## License boundary

- Record source, author, URL/revision, license, modifications and redistribution boundary.
- Repository access is not a media license.
- Never import `images/` or `videos/` from `hasaneyldrm/exercises-dataset`;
  Gym visual owns them and the repository license excludes those files.
- Import only conservatively matched instruction metadata with the pinned script.
- Update third-party notices and reject unclear authorship or redistribution.

## Produce and verify

- Define display size, density, crop, alpha and byte budget.
- Prefer WebP for runtime imagery and PNG only for lossless alpha/platform config.
- Remove metadata and avoid oversized decode dimensions.
- Use explicit aspect ratio, placeholders and fallbacks.
- Audit duplicates, orphans, dimensions, bytes, transparency and offline behavior.
- Test icon and splash on device; a file preview is insufficient.
