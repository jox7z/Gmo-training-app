create or replace function public.sync_profile_goals()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.goal is distinct from old.goal
     and new.goals is not distinct from old.goals then
    new.goals := array[new.goal];
  end if;

  if new.goals is null or array_length(new.goals, 1) is null then
    new.goals := array[coalesce(new.goal, 'hypertrophy')];
  end if;

  new.goal := new.goals[1];
  return new;
end;
$$;

revoke execute on function public.sync_profile_goals()
  from public, anon, authenticated;

revoke execute on function public.complete_signup(
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  int,
  text[]
) from public, anon;

grant execute on function public.complete_signup(
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  int,
  text[]
) to authenticated;

notify pgrst, 'reload schema';
