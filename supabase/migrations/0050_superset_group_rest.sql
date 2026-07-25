-- 0050_superset_group_rest — descanso intra-grupo (medido, no prescrito).
--
-- Añade `group_rest_enabled` a los ejercicios de rutina y de sesión: cuando true,
-- el flujo de descanso autopausado se dispara ENTRE miembros de un superset/triset/
-- circuito (cada serie del round-robin cierra ronda), no solo al final de la ronda.
-- No es un temporizador prescrito: solo decide SI se mide descanso entre miembros.
-- Todos los miembros de un grupo comparten el mismo valor (invariante del editor).

alter table public.routine_day_exercises
  add column group_rest_enabled boolean not null default false;

alter table public.workout_exercises
  add column group_rest_enabled boolean not null default false;
