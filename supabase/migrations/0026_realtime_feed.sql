-- Migration 0026: Enable Realtime for feed tables
-- Adds public.posts and public.post_reactions to the supabase_realtime publication
-- so the frontend can receive INSERT/UPDATE/DELETE events via Supabase channels.
--
-- RLS note:
--   public.posts   → SELECT policy "Posts are visible to authenticated users"
--                    (or equivalent) already exists from migration 0004/0007.
--                    Realtime respects this policy: clients only receive rows
--                    they are allowed to SELECT.
--   public.post_reactions → SELECT is unrestricted (reactions are public counts).
--
-- Both blocks are idempotent: adding a table that already belongs to the
-- publication raises a duplicate_object error, which is silently swallowed.

do $$ begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.post_reactions;
exception when duplicate_object then null; end $$;
