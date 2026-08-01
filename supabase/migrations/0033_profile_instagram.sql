-- Fase 1: Instagram username en perfil
-- Añadir columna (nullable, sin default, constraint de formato)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram_username text
  CHECK (instagram_username ~ '^[A-Za-z0-9._]{1,30}$');

-- El RETURNS TABLE cambia (añade instagram_username), por lo que CREATE OR REPLACE
-- fallaría en Postgres. Hacemos DROP previo (solo la firma exacta, atómico en esta tx).
DROP FUNCTION IF EXISTS public.search_users(text, integer);

-- Actualizar search_users para incluir instagram_username en el resultado
CREATE OR REPLACE FUNCTION public.search_users(query text, lim integer DEFAULT 20)
 RETURNS TABLE(id uuid, username text, display_name text, current_rank text, rank_points integer, followers_count integer, is_following boolean, instagram_username text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    ) as is_following,
    p.instagram_username
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
$function$
