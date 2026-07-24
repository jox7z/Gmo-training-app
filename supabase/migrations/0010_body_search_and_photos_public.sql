-- 0010 Body tracking + user search + post-photos público
--
-- (El prompt pedía 0009_body_search_and_photos_public.sql, pero 0009 ya
--  está ocupado por 0009_avatars_and_counters.sql. Renumerado al siguiente
--  slot disponible. Migración idempotente y segura de re-aplicar.)
--
-- · post-photos → bucket público (URLs directas sin TTL) + policies
--   ajustadas (insert/update/delete por prefijo, select para authenticated).
-- · body_measurements + RLS por dueño + RPC body_timeline.
-- · RPC search_users.
-- · RPCs faltantes para conexiones de perfil:
--     list_followers, list_following, list_user_posts.

-- =====================================================
-- A. Bucket post-photos → público
-- =====================================================
update storage.buckets
   set public = true
 where id = 'post-photos';

-- Recrear policies con nombres canónicos (insert/update/delete/select).
drop policy if exists "post-photos insert own prefix" on storage.objects;
drop policy if exists "post-photos update own prefix" on storage.objects;
drop policy if exists "post-photos delete own prefix" on storage.objects;
drop policy if exists "post-photos read auth"        on storage.objects;

create policy "post-photos insert own prefix"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post-photos update own prefix"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post-photos delete own prefix"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT permitido a authenticated (lectura pública real via getPublicUrl
-- que bypassa RLS cuando bucket.public=true; esta policy cubre acceso
-- explícito vía storage API si algún cliente la usa con un Bearer).
create policy "post-photos read auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'post-photos');

-- =====================================================
-- B. body_measurements
-- =====================================================
create table if not exists public.body_measurements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  recorded_at  timestamptz not null default now(),
  weight_kg    numeric(5,2) not null check (weight_kg between 20 and 400),
  body_fat_pct numeric(4,2)          check (body_fat_pct between 1 and 70),
  muscle_pct   numeric(4,2)          check (muscle_pct   between 1 and 80),
  water_pct    numeric(4,2)          check (water_pct    between 20 and 90),
  notes        text                  check (notes is null or length(notes) <= 280),
  created_at   timestamptz not null default now()
);

create index if not exists body_measurements_user_recorded_idx
  on public.body_measurements (user_id, recorded_at desc);

alter table public.body_measurements enable row level security;

drop policy if exists "body_measurements select own" on public.body_measurements;
drop policy if exists "body_measurements insert own" on public.body_measurements;
drop policy if exists "body_measurements update own" on public.body_measurements;
drop policy if exists "body_measurements delete own" on public.body_measurements;

create policy "body_measurements select own"
  on public.body_measurements for select to authenticated
  using (user_id = auth.uid());

create policy "body_measurements insert own"
  on public.body_measurements for insert to authenticated
  with check (user_id = auth.uid());

create policy "body_measurements update own"
  on public.body_measurements for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "body_measurements delete own"
  on public.body_measurements for delete to authenticated
  using (user_id = auth.uid());

-- =====================================================
-- C. RPC body_timeline(period)
-- =====================================================
create or replace function public.body_timeline(period text default '90d')
returns table (
  recorded_at  date,
  weight_kg    numeric,
  body_fat_pct numeric,
  muscle_pct   numeric,
  water_pct    numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid   uuid := auth.uid();
  v_start timestamptz;
  v_end   timestamptz := now();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if period not in ('7d','30d','90d','all') then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  if period = '7d' then
    v_start := v_end - interval '7 days';
  elsif period = '30d' then
    v_start := v_end - interval '30 days';
  elsif period = '90d' then
    v_start := v_end - interval '90 days';
  else
    v_start := 'epoch'::timestamptz;
  end if;

  return query
  select
    bm.recorded_at::date,
    bm.weight_kg::numeric,
    bm.body_fat_pct::numeric,
    bm.muscle_pct::numeric,
    bm.water_pct::numeric
  from public.body_measurements bm
  where bm.user_id     = v_uid
    and bm.recorded_at >= v_start
    and bm.recorded_at <= v_end
  order by bm.recorded_at desc;
end;
$$;

grant execute on function public.body_timeline(text) to authenticated;

-- =====================================================
-- D. RPC search_users(query, lim)
-- =====================================================
create or replace function public.search_users(query text, lim int default 20)
returns table (
  id              uuid,
  username        text,
  display_name    text,
  current_rank    text,
  rank_points     int,
  followers_count int,
  is_following    boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_q   text := trim(coalesce(query, ''));
  v_pat text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if char_length(v_q) < 2 then
    return;  -- query muy corta → set vacío
  end if;

  v_pat := '%' || v_q || '%';

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.current_rank,
    p.rank_points,
    coalesce(fc.cnt, 0)::int as followers_count,
    exists (
      select 1 from public.follows f
      where f.follower_id = v_uid and f.following_id = p.id
    ) as is_following
  from public.profiles p
  left join lateral (
    select count(*)::int as cnt
    from public.follows
    where following_id = p.id
  ) fc on true
  where p.id <> v_uid
    and (p.username ilike v_pat or p.display_name ilike v_pat)
  order by
    (exists (select 1 from public.follows f
              where f.follower_id = v_uid and f.following_id = p.id)) desc,
    p.rank_points desc nulls last,
    p.username asc
  limit greatest(1, least(coalesce(lim, 20), 50));
end;
$$;

grant execute on function public.search_users(text, int) to authenticated;

-- =====================================================
-- E. list_followers / list_following
-- =====================================================
-- Shape pedido: (id, username, display_name, current_rank, is_following)
create or replace function public.list_followers(target_user_id uuid)
returns table (
  id           uuid,
  username     text,
  display_name text,
  current_rank text,
  is_following boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.current_rank,
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
  is_following boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.current_rank,
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

-- =====================================================
-- F. list_user_posts — feed paginado de UN solo usuario
-- =====================================================
-- Mismo shape que feed_for_user (0007) para que el cliente reutilice el
-- mapping snake→camel y el componente FeedItem.
create or replace function public.list_user_posts(
  target_user_id uuid,
  cursor_ts      timestamptz default null,
  lim            int         default 20
) returns table (
  id            uuid,
  user_id       uuid,
  type          text,
  ref_id        uuid,
  title         text,
  subtitle      text,
  caption       text,
  photo_url     text,
  share_count   int,
  comment_count int,
  metadata      jsonb,
  created_at    timestamptz,
  username      text,
  display_name  text,
  avatar_url    text,
  current_rank  text,
  fire_count    int,
  muscle_count  int,
  clap_count    int,
  my_reactions  text[]
)
language sql
security definer
set search_path = public
stable
as $$
  with v as (
    select auth.uid() as uid,
           greatest(1, least(coalesce(lim, 20), 100)) as lim
  )
  select
    p.id, p.user_id, p.type, p.ref_id, p.title, p.subtitle, p.caption,
    p.photo_url,
    p.share_count,
    coalesce(cc.comment_count, 0)::int,
    p.metadata, p.created_at,
    pr.username, pr.display_name, pr.avatar_url, pr.current_rank,
    coalesce(rc.fire_count,   0)::int,
    coalesce(rc.muscle_count, 0)::int,
    coalesce(rc.clap_count,   0)::int,
    coalesce(mr.types, '{}')::text[]
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  cross join v
  left join lateral (
    select
      count(*) filter (where r.type = 'fire')   as fire_count,
      count(*) filter (where r.type = 'muscle') as muscle_count,
      count(*) filter (where r.type = 'clap')   as clap_count
    from public.post_reactions r
    where r.post_id = p.id
  ) rc on true
  left join lateral (
    select array_agg(r.type) as types
    from public.post_reactions r
    where r.post_id = p.id and r.user_id = v.uid
  ) mr on true
  left join lateral (
    select count(*)::int as comment_count
    from public.post_comments cm
    where cm.post_id = p.id
  ) cc on true
  where p.user_id = list_user_posts.target_user_id
    and (list_user_posts.cursor_ts is null or p.created_at < list_user_posts.cursor_ts)
  order by p.created_at desc
  limit (select v.lim from v);
$$;

grant execute on function public.list_user_posts(uuid, timestamptz, int) to authenticated;

-- =====================================================
-- G. Verificación de RPCs existentes
-- =====================================================
-- follow_user(target uuid)   — definida en 0004_social_feed.sql ✓
-- unfollow_user(target uuid) — definida en 0004_social_feed.sql ✓
-- Sin cambios necesarios.

-- =====================================================
-- VERIFICAR — superficie nueva para Backend
-- =====================================================
-- Bucket Storage:
--   post-photos  (public=true)
--     · insert/update/delete restringidos por prefijo {auth.uid()}/...
--     · select authenticated (acceso real vía getPublicUrl sin TTL)
--
-- Tabla nueva:
--   public.body_measurements
--     (id, user_id, recorded_at, weight_kg, body_fat_pct, muscle_pct,
--      water_pct, notes, created_at)
--     RLS: SELECT/INSERT/UPDATE/DELETE solo si user_id = auth.uid().
--
-- RPCs nuevas (grant execute → authenticated):
--   public.body_timeline(period text default '90d')
--     returns table(recorded_at date, weight_kg numeric,
--                   body_fat_pct numeric, muscle_pct numeric, water_pct numeric)
--     period ∈ {'7d','30d','90d','all'}; filtra por auth.uid(); orden desc.
--
--   public.search_users(query text, lim int default 20)
--     returns table(id uuid, username text, display_name text,
--                   current_rank text, rank_points int,
--                   followers_count int, is_following boolean)
--     query mínimo 2 chars (si no, set vacío); excluye al caller;
--     orden: is_following desc, rank_points desc, username asc.
--
--   public.list_followers(target_user_id uuid)
--   public.list_following(target_user_id uuid)
--     returns table(id, username, display_name, current_rank, is_following)
--     is_following es relativo al auth.uid() (no a target_user_id).
--
--   public.list_user_posts(target_user_id uuid,
--                          cursor_ts timestamptz default null,
--                          lim int default 20)
--     Mismo shape que feed_for_user (0007). Filtra por user_id = target.
--     Paginación por cursor_ts (created_at < cursor_ts).
--
-- =====================================================
-- SETUP MANUAL — Dashboard Supabase
-- =====================================================
-- Si el `update storage.buckets set public = true` falla por permisos
-- del rol que ejecuta la migración (algunos proyectos Supabase reservan
-- ediciones de buckets a la UI), aplicar manualmente:
--   Dashboard → Storage → bucket `post-photos` → Edit bucket →
--     marcar "Public bucket" → Save.
-- El resto de la migración no depende de eso (las policies se aplican
-- igual; lo único que cambia es si getPublicUrl devuelve URL accesible
-- sin autenticación).
