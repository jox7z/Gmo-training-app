-- Migration 0040: Drop AI Coach feature remnants
-- The "Coach IA" feature has been fully removed from the app. The client entry
-- points (app/coach.tsx, src/lib/coach.ts, src/lib/queries/coach.ts,
-- src/lib/repos/coach.ts) and the `coach` Edge Function are gone. This migration
-- removes the now-dead backend objects that only the coach used:
--   * function public.ai_usage_remaining()      (added in 0027, called by the coach client)
--   * function public.increment_cache_hit(text)  (added in 0019, called by the coach Edge Function)
--   * table public.ai_usage_log                  (coach usage/rate-limit log)
--   * table public.ai_response_cache             (coach response cache)
--   * table public.ai_messages                   (dead since 0001 — coach conversation history)
--   * table public.ai_conversations              (dead since 0001 — coach conversation history)
--
-- NOTE: `generate_routine` (AI routine generation) does NOT use any of these
-- objects and is intentionally left untouched. The shared provider secrets
-- (GEMINI/ANTHROPIC/OPENAI_API_KEY) are also retained for generate_routine.
--
-- Verified before applying: no external FKs point at these tables; all four
-- tables are empty in the live project. DROP TABLE CASCADE cleans up the
-- attached indexes (ai_cache_expires_idx, ai_usage_user_date_idx) and RLS
-- policies ("ai_conv own", "ai_msg follow conv", "ai_usage own read").

begin;

-- Functions first (no dependency on the tables surviving, but tidy).
drop function if exists public.ai_usage_remaining();
drop function if exists public.increment_cache_hit(text);

-- Tables: children before parents. CASCADE removes indexes + RLS policies.
drop table if exists public.ai_messages cascade;
drop table if exists public.ai_conversations cascade;
drop table if exists public.ai_usage_log cascade;
drop table if exists public.ai_response_cache cascade;

commit;
