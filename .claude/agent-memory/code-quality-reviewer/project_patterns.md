---
name: project-patterns
description: Architecture patterns, optimistic update conventions, and recurring anti-patterns in the Gmo Training App
metadata:
  type: project
---

## Optimistic update pattern (TanStack Query)
- onMutate: cancel queries, snapshot prev, patch cache, return context
- onError: restore from context snapshot (reverts query cache only)
- onSettled: invalidate (no refetch on sensitive lists to avoid scroll reset)
- **Critical gap**: frozen local state in connections.tsx is NOT covered by onError rollbacks — it diverges from the global cache on mutation failure. See [[frozen-divergence-bug]].

## Frozen list pattern (connections.tsx)
- First-load data is frozen into local state to prevent rows disappearing on unfollow (Instagram style)
- handleFollowChange patches `isFollowing` on frozen rows optimistically
- handleRefresh clears frozen + refetches
- Bug: `frozen` is never reset when `type` (followers/following) or `targetUsername` changes while the component stays mounted (e.g. param change via router). [[frozen-stale-on-param-change]]

## ExercisePickerModal dropdown
- `groupOpen` state is never reset to false when the modal is hidden (visible=false) and re-shown — it can open with the dropdown already expanded
- No zIndex issues for inline dropdown since it sits above ScrollView in the tree

## FeedItem ActionButton
- `label` is now `''` (empty string) when no reaction is active — component conditionally omits the Text node, which is correct
- The reaction button's emoji fallback '👊' is always rendered, so the button never collapses to zero width — layout is stable
