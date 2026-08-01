-- Instagram verification state. `instagram_username` already exists from 0033.
-- This restores the exact schema/trigger contract currently deployed.

alter table public.profiles
  add column instagram_user_id text,
  add column instagram_verified boolean not null default false,
  add column instagram_linked_at timestamptz;

create unique index profiles_instagram_user_id_uq
  on public.profiles (instagram_user_id)
  where instagram_user_id is not null;

create or replace function public.protect_instagram_verification()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_role text := coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  );
begin
  -- service_role (edge function) y migraciones pueden escribir libremente
  if v_role = 'service_role' or session_user = 'postgres' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.instagram_verified := false;
    new.instagram_user_id := null;
    new.instagram_linked_at := null;
  else
    -- El cliente nunca puede tocar estas columnas (se preservan los OLD)
    new.instagram_verified := old.instagram_verified;
    new.instagram_user_id := old.instagram_user_id;
    new.instagram_linked_at := old.instagram_linked_at;

    -- Cambiar/borrar el username degrada a no verificado.
    if new.instagram_username is distinct from old.instagram_username then
      new.instagram_verified := false;
      new.instagram_user_id := null;
      new.instagram_linked_at := null;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_protect_instagram on public.profiles;

create trigger trg_protect_instagram
before insert or update on public.profiles
for each row
execute function public.protect_instagram_verification();

-- ACL exacta observada en live. El trigger no depende de estos grants.
revoke all on function public.protect_instagram_verification()
  from public, anon, authenticated, service_role;
grant execute on function public.protect_instagram_verification()
  to public, anon, authenticated, service_role;