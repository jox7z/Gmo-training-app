-- 0025_drop_volume_metric.sql
-- Stop writing/computing total_volume_kg.
-- The column is left in place (default 0) so existing data is not destroyed.
-- The trigger and function that kept it updated are dropped; they are no
-- longer needed because the frontend no longer sends or reads the value.

drop trigger if exists trg_recompute_volume on public.workout_sets;
drop function if exists public.recompute_workout_volume();

-- Replace recalc_weekly_ranks() without total_volume_kg so the weekly job
-- no longer reads or writes that column.
create or replace function public.recalc_weekly_ranks()
returns void language plpgsql security definer set search_path = public as $$
declare
  prev_year int;
  prev_week int;
begin
  select extract(isoyear from now() - interval '1 week')::int,
         extract(week from now() - interval '1 week')::int
    into prev_year, prev_week;

  -- 1. Aggregate previous week stats per user (volume column omitted)
  insert into public.weekly_stats (user_id, iso_year, iso_week, workout_days, goal_met)
  select
    w.user_id,
    prev_year,
    prev_week,
    count(distinct date_trunc('day', w.started_at)),
    count(distinct date_trunc('day', w.started_at)) >= p.weekly_goal_days
  from public.workouts w
  join public.profiles p on p.id = w.user_id
  where extract(isoyear from w.started_at)::int = prev_year
    and extract(week    from w.started_at)::int = prev_week
  group by w.user_id, p.weekly_goal_days
  on conflict (user_id, iso_year, iso_week) do update
    set workout_days = excluded.workout_days,
        goal_met     = excluded.goal_met;

  -- 2. Update streaks
  update public.streaks s
  set current_weeks = case when ws.goal_met then s.current_weeks + 1 else 0 end,
      longest_weeks = greatest(s.longest_weeks, case when ws.goal_met then s.current_weeks + 1 else s.longest_weeks end),
      last_qualifying_week = case when ws.goal_met then current_date else s.last_qualifying_week end
  from public.weekly_stats ws
  where ws.user_id = s.user_id and ws.iso_year = prev_year and ws.iso_week = prev_week;

  -- 3. Award/deduct points based on goal + streak
  update public.profiles p set rank_points = greatest(0, p.rank_points + delta.delta)
  from (
    select
      ws.user_id,
      (case when ws.goal_met then 30 else -20 end)
      + (case when s.current_weeks >= 4 then 15 else 0 end)
      + (case when ws.workout_days > p.weekly_goal_days then least(30, (ws.workout_days - p.weekly_goal_days) * 10) else 0 end)
      as delta
    from public.weekly_stats ws
    join public.streaks s on s.user_id = ws.user_id
    join public.profiles p on p.id = ws.user_id
    where ws.iso_year = prev_year and ws.iso_week = prev_week
  ) delta
  where p.id = delta.user_id;

  -- 4. Promote / demote rank based on thresholds
  with new_ranks as (
    select id,
      case
        when rank_points >= 3000 then 'legend'
        when rank_points >= 1500 then 'elite'
        when rank_points >= 700  then 'platinum'
        when rank_points >= 300  then 'gold'
        when rank_points >= 100  then 'silver'
        else 'bronze'
      end as new_rank,
      current_rank
    from public.profiles
  )
  insert into public.rank_history (user_id, from_rank, to_rank, reason)
  select id, current_rank, new_rank, 'weekly recalculation'
  from new_ranks where current_rank is distinct from new_rank;

  update public.profiles p set current_rank =
    case
      when rank_points >= 3000 then 'legend'
      when rank_points >= 1500 then 'elite'
      when rank_points >= 700  then 'platinum'
      when rank_points >= 300  then 'gold'
      when rank_points >= 100  then 'silver'
      else 'bronze'
    end;
end;
$$;
