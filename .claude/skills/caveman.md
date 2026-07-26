---
name: caveman
description: Be a caveman. No preamble, no goodbyes, no filler. Action first.
---

# Caveman mode

- Permanent default for this repository and every delegated agent.
- No preamble. No goodbyes. No filler sentences.
- Never narrate what you're going to do — just do it.
- Action first; explain only if asked.
- Short sentences. No restating the question. No summaries of what you just did unless asked.
- A code change is not finished until the relevant project memory is updated.
- Update `docs/memory/checklist.md` on every completed request. Also update the roadmap,
  architecture, overview, prompts, or operational playbook when their facts changed.
- Record date, status, verification evidence, remaining risk, and the next executable step.
- Never mark an item complete before its required checks pass.
- When adopting an external dataset, record the pinned revision and license boundary.
  Do not import media whose repository license explicitly excludes redistribution.
- Never mark multi-table sync as idempotent by swallowing duplicate-parent errors.
  A retry must reconcile or transactionally replace every required child row.
- Prefer one shared component/asset/helper over copied implementations.
- Keep progress trends factual: load, reps and recorded time. Work stays only in
  session ledgers/social summaries, never as a selectable trend or comparative PR.
  Never add opaque strength estimates, rep prescriptions or automatic verdicts.
- Exercise progress selects only trained exercises. Use the shared searchable
  picker: latest six, most trained, all, muscle/equipment filters. Search the full
  trained list, preserve legacy IDs, show bundled local thumbnails with dumbbell
  fallback, and keep selection local without backend. Keep picker sheet height
  stable while search/filter changes only scrollable results.
- Reuse `workoutPostMetadata.ts` + `WorkoutShareCard` for workout social data.
  Never hand-read untyped `posts.metadata` in UI.
- Social/public streams use the shared stream layout: full width on phones,
  max 600 px centered on larger screens, no lateral border/radius, 8 px gaps,
  16 px internal reading padding and 4:5 full-bleed media. Keep reusable card
  defaults contained and opt in explicitly at every stream call site.
- Reading sections use `Card variant="section"`: no lateral border, only
  top/bottom separators. Keep full borders for compact controls, forms, modals,
  selectable tiles and state feedback.
- Reuse `Skeleton` + `SkeletonGroup`; one pulse per group. Skeleton only initial
  load without cached data. Refetch, pagination and mutations keep their existing
  feedback paths.
- Lock publication for the full sync/upload/RPC path. Validate numeric input as a
  complete finite value; reps are integers. Historical PRs use a total temporal
  order including creation time and ID.
- Never expose a privacy/notification switch unless the server/native behavior is
  real, persisted and verified.
- Prefer square surfaces. Keep `radius.full` only for genuinely circular geometry;
  cards, chips, badges, inputs and decorative icon shells use the small radius tokens.
- Add dependencies only when the measurable benefit exceeds bundle, maintenance,
  security and native-build cost.
- Close with `npm test`, typecheck, lint and the proportional runtime/bundle gate.
