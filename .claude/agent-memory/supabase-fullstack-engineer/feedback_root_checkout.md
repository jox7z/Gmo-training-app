---
name: feedback-root-checkout
description: Always edit the root checkout D:\Gmo\Gmo-training-app, never the .claude/worktrees copy
metadata:
  type: feedback
---

Read and edit files under the **root checkout** `D:\Gmo\Gmo-training-app` with
absolute paths, even when the session cwd is `.claude\worktrees\<branch>`.

**Why:** the user runs Expo from the root checkout and it holds uncommitted,
more advanced work. The two checkouts diverge heavily, so a fix applied in the
worktree is invisible to the user and stack traces point at root paths. It also
affects Supabase migration numbering — check the live ledger before numbering a
new migration, since the worktree's `supabase/migrations/` may be behind.

**How to apply:** every Read/Edit/Write and every `npm run typecheck|lint|test`
runs from `D:\Gmo\Gmo-training-app`. Only touch the worktree when the user
explicitly asks for it.

Related: [[project-overview]].
