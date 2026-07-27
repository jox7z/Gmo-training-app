-- Migration 0027: RPC ai_usage_remaining()
-- Returns (used int, limit int) for the authenticated user based on the same
-- 1-hour rolling window and row-count logic used in the coach Edge Function
-- (RATE_LIMIT_PER_HOUR = 30, counts all rows regardless of status).

create or replace function public.ai_usage_remaining()
returns table(used int, "limit" int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_count   int;
begin
  v_user_id := auth.uid();

  -- Unauthenticated callers get 0/30 (no usage info to leak).
  if v_user_id is null then
    return query select 0::int, 30::int;
    return;
  end if;

  select count(*)::int
  into   v_count
  from   public.ai_usage_log
  where  user_id   = v_user_id
    and  created_at >= now() - interval '1 hour';

  return query select v_count, 30::int;
end;
$$;

grant execute on function public.ai_usage_remaining() to authenticated;
