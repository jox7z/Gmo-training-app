-- 0016 Fix toggle_reaction: aceptar 'muscle' y 'heart' (no 'fire'/'clap')
--
-- La migración 0012 consolidó las reacciones a dos tipos (muscle + heart):
-- actualizó el CHECK de post_reactions y los feeds, PERO olvidó actualizar
-- la función toggle_reaction, que seguía con la validación original de 0004
-- (`reaction in ('fire','muscle','clap')`). Resultado: reaccionar con 'heart'
-- lanzaba 'invalid reaction' y el corazón no funcionaba en el frontend.
--
-- Esta migración recrea toggle_reaction con la validación correcta. La firma
-- no cambia, así que el frontend no requiere cambios.

create or replace function public.toggle_reaction(post_id uuid, reaction text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_removed boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if reaction not in ('muscle','heart') then
    raise exception 'invalid reaction' using errcode = '22023';
  end if;
  if not exists (select 1 from public.posts p where p.id = toggle_reaction.post_id) then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  delete from public.post_reactions r
    where r.post_id = toggle_reaction.post_id
      and r.user_id = v_uid
      and r.type    = reaction
  returning true into v_removed;

  if coalesce(v_removed, false) then
    return false;
  end if;

  insert into public.post_reactions (post_id, user_id, type)
  values (toggle_reaction.post_id, v_uid, reaction)
  on conflict do nothing;

  return true;
end;
$$;

grant execute on function public.toggle_reaction(uuid, text) to authenticated;
