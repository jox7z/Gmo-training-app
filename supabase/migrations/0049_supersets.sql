-- 0049_supersets.sql
-- Supersets (MVP pares de 2): columna opcional que agrupa ejercicios contiguos
-- de una rutina/sesión. NULL = ejercicio suelto. Sin FK: es un id de agrupación
-- generado en el cliente (uuid), no una referencia a otra fila.
--
-- RLS: no requiere cambios. Las policies existentes de routine_day_exercises y
-- workout_exercises autorizan la fila completa vía join al padre
-- (routine_days -> routines.user_id / workout_exercises -> workouts.user_id),
-- así que la columna nueva queda cubierta automáticamente.

alter table public.routine_day_exercises add column superset_group_id uuid null;
alter table public.workout_exercises add column superset_group_id uuid null;

-- Índices parciales: solo filas agrupadas (la gran mayoría queda NULL).
create index rde_superset_group_idx
  on public.routine_day_exercises (superset_group_id)
  where superset_group_id is not null;

create index we_superset_group_idx
  on public.workout_exercises (superset_group_id)
  where superset_group_id is not null;
