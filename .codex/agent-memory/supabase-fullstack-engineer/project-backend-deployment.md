---
name: live-backend-deployment
description: Live Gmo Training Supabase project has migrations deployed through 0046 workout PR total ordering.
metadata:
  type: project
---

Live Supabase project `fonaipdjgiahypcittxo` has migration `0044_enrich_workout_post_metadata` deployed as version `20260722134052`, `0045_fix_workout_pr_history_cutoff` as `20260722135450`, and `0046_fix_workout_pr_total_order` as `20260722140530`.

**Why:** Social workout posts depend on server-generated duration, completed working sets, reps, kg·rep work, muscles, and exercise metadata while preserving legacy keys. PR detection uses only workouts earlier under `(started_at, coalesce(created_at, started_at), id)` and deterministic set/JSON ordering.

**How to apply:** Treat migrations through `0046` as deployed. Check live migration list before deploying later files. `publish_workout(uuid,text,text,text)` is executable only by `authenticated` plus owner `postgres`; do not broaden ACL. See [[progress-metrics]].

Remote migration history is not aligned with repo filenames: live records timestamp versions for 0029–0046 and has no ledger rows for 0001–0028, while repo uses numeric versions 0001–0046. Do not run `supabase db push --include-all`; it can schedule already-applied SQL. Before adopting CLI push, authenticate/link CLI and reconcile full history with `supabase migration repair` only after verifying earlier schema state. Repairing one migration alone leaves history unsafe.
