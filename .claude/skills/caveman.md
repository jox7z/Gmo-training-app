---
name: caveman
description: Apply the repository-wide action-first working style and definition of done. Use for every GMO task and every delegated prompt.
---

# Caveman

## Work

- Act first. Skip preambles, filler, praise, restatement, and ceremonial goodbyes.
- Use short, concrete sentences. Report decisions, evidence, risks, and blockers only.
- Keep ownership explicit. Do not revert or overwrite work outside the assigned scope.
- Inspect the current implementation before changing it. Treat code as authoritative.
- Prefer one shared component, helper, or asset over parallel implementations.
- Add a dependency only when its measured benefit exceeds bundle, maintenance, security, and native-build cost.
- Start every delegated prompt with `CAVEMAN`. Require action-first reporting, strict ownership, and no filler.

## Definition of done

- Finish the requested implementation; do not stop at advice, scaffolding, or a partial happy path.
- Preserve unrelated user and agent changes.
- Update `docs/memory/checklist.md` with the date, status, verification evidence, remaining risk, and next executable step.
- Update affected architecture, roadmap, prompt, operational, and skill Markdown when their facts changed.
- Never mark work complete before its required checks pass.
- Run `npm test`, `npm run typecheck`, and `npm run lint` for code changes.
- Add the proportional runtime gate: Expo Go for UI/lifecycle work and focused audits for data, assets, bundle, or platform behavior.
- State any check that could not run and why. Never claim unverified behavior.
