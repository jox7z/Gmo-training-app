-- 0005 Feed fixes
--
-- A. discover_athletes → returns table(...) que incluye is_following.
-- B. feed_for_user: verificado, sin drift. No se toca.
-- C. handle_new_user: se elimina la rama que leía raw_user_meta_data->>'username'.
--    El cliente nunca envía username en options.data; el real lo escribe
--    complete_signup. Aquí queda solo el fallback 'user_<shortid>'.

-- =====================================================
-- A. discover_athletes con is_following
-- =====================================================
-- DROP necesario: cambia el tipo de retorno (setof profiles → table(...)).
drop function if exists public.discover_athletes(int);

create or replace function public.discover_athletes(lim int default 5)
returns table (
  id                         uuid,
  username                   text,
  display_name               text,
  avatar_url                 text,
  weight_kg                  numeric,
  height_cm                  numeric,
  unit_preference            text,
  experience_level           text,
  goal                       text,
  current_rank               text,
  rank_points                int,
  weekly_goal_days           int,
  created_at                 timestamptz,
  auto_publish_achievements  boolean,
  is_following               boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select id, current_rank from public.profiles where id = auth.uid()
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.weight_kg,
    p.height_cm,
    p.unit_preference,
    p.experience_level,
    p.goal,
    p.current_rank,
    p.rank_points,
    p.weekly_goal_days,
    p.created_at,
    p.auto_publish_achievements,
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = p.id
    ) as is_following
  from public.profiles p, me
  where p.id <> me.id
    and p.current_rank is not distinct from me.current_rank
    and not exists (
      select 1 from public.follows f
      where f.follower_id = me.id and f.following_id = p.id
    )
  order by p.rank_points desc nulls last, p.created_at asc
  limit greatest(1, least(coalesce(lim, 5), 50));
$$;

grant execute on function public.discover_athletes(int) to authenticated;

-- =====================================================
-- B. feed_for_user: verificación
-- =====================================================
-- Shape declarado en 0004:
--   id uuid, user_id uuid, type text, ref_id uuid, title text, subtitle text,
--   caption text, metadata jsonb, created_at timestamptz,
--   username text, display_name text, avatar_url text, current_rank text,
--   fire_count int, muscle_count int, clap_count int, my_reactions text[]
-- SELECT proyecta p.* (tipos coinciden), pr.{username,display_name,avatar_url,current_rank}
-- (todos text) y los conteos con ::int + array_agg(...)::text[]. Sin drift → no se redefine.

-- =====================================================
-- C. handle_new_user sin lectura de raw_user_meta_data->>'username'
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short_id text;
  v_username text;
  v_display  text;
begin
  v_short_id := substr(replace(new.id::text, '-', ''), 1, 15);

  -- El cliente nunca envía 'username' en options.data; complete_signup
  -- lo sobreescribe con el valor real tras el signup.
  v_username := 'user_' || v_short_id;

  v_display := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
  if v_display is null then
    v_display := 'Atleta';
  end if;

  insert into public.profiles (
    id,
    username,
    display_name,
    weekly_goal_days,
    rank_points,
    current_rank
  ) values (
    new.id,
    v_username,
    v_display,
    4,
    0,
    'bronze'
  )
  on conflict (id) do nothing;

  insert into public.streaks (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- migration 0005 end
