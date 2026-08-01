-- Add rank_points to list_followers and list_following RPCs

create or replace function public.list_followers(target_user_id uuid)
returns table (
  id           uuid,
  username     text,
  display_name text,
  current_rank text,
  rank_points  int,
  is_following boolean
)
language sql security definer set search_path = public stable
as $$
  select
    p.id, p.username, p.display_name, p.current_rank,
    coalesce(p.rank_points, 0)::int,
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = p.id
    ) as is_following
  from public.follows fl
  join public.profiles p on p.id = fl.follower_id
  where fl.following_id = target_user_id
  order by fl.created_at desc;
$$;
grant execute on function public.list_followers(uuid) to authenticated;

create or replace function public.list_following(target_user_id uuid)
returns table (
  id           uuid,
  username     text,
  display_name text,
  current_rank text,
  rank_points  int,
  is_following boolean
)
language sql security definer set search_path = public stable
as $$
  select
    p.id, p.username, p.display_name, p.current_rank,
    coalesce(p.rank_points, 0)::int,
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = p.id
    ) as is_following
  from public.follows fl
  join public.profiles p on p.id = fl.following_id
  where fl.follower_id = target_user_id
  order by fl.created_at desc;
$$;
grant execute on function public.list_following(uuid) to authenticated;
