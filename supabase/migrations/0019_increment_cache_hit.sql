-- Atomic hit_count increment for ai_response_cache.
-- Replaces the non-atomic getHitCount SELECT + UPDATE pattern in the coach edge function.
create or replace function public.increment_cache_hit(p_hash text)
returns void
language sql
security definer
as $$
  update public.ai_response_cache
  set hit_count = hit_count + 1
  where prompt_hash = p_hash;
$$;
