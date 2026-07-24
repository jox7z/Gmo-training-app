-- 0006 Signup email-only compatibility check + is_profile_complete helper
--
-- (El slot 0004 lo ocupa 0004_social_feed.sql y el 0005 está aplicado;
--  esta migración corresponde al prompt SIMPL-1A, renumerada al
--  siguiente slot disponible.)
--
-- Contexto: el nuevo flujo de signup pasa SOLO email + password.
-- raw_user_meta_data llega vacío (sin username, sin display_name).
--
-- Verificación del trigger handle_new_user actual (versión vigente en
-- 0005_feed_fixes.sql, que reemplazó la de 0003):
--
--   v_short_id := substr(replace(new.id::text, '-', ''), 1, 15);
--   v_username := 'user_' || v_short_id;             -- ✅ fallback fijo
--   v_display  := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
--   if v_display is null then v_display := 'Atleta'; end if;   -- ✅ fallback
--
-- Conclusión: el trigger ya es 100% compatible con signup email-only.
-- No requiere modificación. Esta migración NO re-crea el trigger.
--
-- complete_signup (definida en 0003) es la encargada de escribir el
-- username y display_name reales tras el onboarding.

-- =====================================================
-- is_profile_complete(uid) — helper para forzar onboarding
-- =====================================================
-- El cliente la llama al abrir la app: si devuelve false, redirige a
-- /onboarding aunque el store local marque onboarded=true (caso "se
-- registró, cerró la app sin terminar").
--
-- Criterio de "completo":
--   · username distinto del temporal del trigger ('user_<15 hex>')
--   · weight_kg y height_cm presentes
create or replace function public.is_profile_complete(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and username !~ '^user_[a-f0-9]{15}$'
      and weight_kg is not null
      and height_cm is not null
  );
$$;

grant execute on function public.is_profile_complete(uuid) to authenticated;
