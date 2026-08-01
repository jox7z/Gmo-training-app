-- 0018 body_measurements: una medición por usuario por día calendario
--
-- Problema: la tabla no tenía constraint de unicidad por día; el check
-- cliente era racy y timezone-frágil. El RPC body_timeline devolvía
-- varias filas por día sin agrupar (orden desc), lo que causaba que el
-- chart en el cliente posicionara los puntos por índice, produciendo
-- líneas invertidas/zigzag.
--
-- Solución:
--   1. Columna `measured_on date` como llave de negocio para el día.
--   2. Unique index (user_id, measured_on) para garantizar unicidad en BD.
--   3. Deduplicar datos existentes (conservar fila más reciente por día).
--   4. Recrear body_timeline: devuelve exactamente una fila por día,
--      orden ascendente por fecha.

-- =====================================================
-- A. Añadir columna measured_on (nullable primero para backfill)
-- =====================================================
alter table public.body_measurements
  add column if not exists measured_on date;

-- Backfill con la fecha UTC de recorded_at (aproximación para datos
-- históricos; datos nuevos traerán el día local correcto desde el cliente).
update public.body_measurements
   set measured_on = (recorded_at)::date
 where measured_on is null;

-- =====================================================
-- B. Deduplicar filas existentes que colisionen en (user_id, measured_on)
--    Conservar la de recorded_at más reciente; borrar el resto.
-- =====================================================
delete from public.body_measurements a
 using public.body_measurements b
 where a.user_id      = b.user_id
   and a.measured_on  = b.measured_on
   and a.recorded_at  < b.recorded_at;

-- Caso de empate exacto en recorded_at (dos filas idénticas): conservar
-- la de ctid mayor (la inserción más tardía en el heap).
delete from public.body_measurements a
 using public.body_measurements b
 where a.user_id      = b.user_id
   and a.measured_on  = b.measured_on
   and a.recorded_at  = b.recorded_at
   and a.ctid         < b.ctid;

-- =====================================================
-- C. Hacer measured_on NOT NULL + default
-- =====================================================
alter table public.body_measurements
  alter column measured_on set not null,
  alter column measured_on set default (now())::date;

-- =====================================================
-- D. Unique index
-- =====================================================
create unique index if not exists body_measurements_user_day_uidx
  on public.body_measurements (user_id, measured_on);

-- =====================================================
-- E. Recrear body_timeline(period)
--    - Una fila por día (distinct on measured_on, registro más reciente)
--    - Devuelve measured_on como columna de fecha
--    - Orden ascendente por día (para que el chart cliente plotee
--      cronológicamente sin reordenar)
-- =====================================================
-- El nombre de la primera columna de retorno cambia (recorded_at →
-- measured_on); CREATE OR REPLACE no permite renombrar columnas de
-- RETURNS TABLE, así que hay que dropear la función primero.
drop function if exists public.body_timeline(text);

create or replace function public.body_timeline(period text default '90d')
returns table (
  measured_on  date,
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
  v_start date;
  v_end   date := current_date;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if period not in ('7d','30d','90d','all') then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  if period = '7d' then
    v_start := v_end - 7;
  elsif period = '30d' then
    v_start := v_end - 30;
  elsif period = '90d' then
    v_start := v_end - 90;
  else
    v_start := '1970-01-01'::date;
  end if;

  -- distinct on (measured_on) con order por recorded_at desc asegura
  -- que si por alguna razón hubiera dos filas el mismo día (race durante
  -- la transición), siempre devuelve la más reciente.
  -- El wrapper exterior reordena ascendente para el chart.
  return query
  select
    t.measured_on,
    t.weight_kg::numeric,
    t.body_fat_pct::numeric,
    t.muscle_pct::numeric,
    t.water_pct::numeric
  from (
    select distinct on (bm.measured_on)
      bm.measured_on,
      bm.weight_kg,
      bm.body_fat_pct,
      bm.muscle_pct,
      bm.water_pct
    from public.body_measurements bm
    where bm.user_id     = v_uid
      and bm.measured_on >= v_start
      and bm.measured_on <= v_end
    order by bm.measured_on, bm.recorded_at desc
  ) t
  order by t.measured_on asc;
end;
$$;

grant execute on function public.body_timeline(text) to authenticated;
