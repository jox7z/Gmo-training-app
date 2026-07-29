-- Recuperada desde supabase_migrations.schema_migrations (version 20260724222557)
-- tras el borrado accidental del working tree el 2026-07-29.
alter table public.routine_day_exercises add column superset_group_id uuid null;
alter table public.workout_exercises add column superset_group_id uuid null;

create index rde_superset_group_idx
  on public.routine_day_exercises (superset_group_id)
  where superset_group_id is not null;

create index we_superset_group_idx
  on public.workout_exercises (superset_group_id)
  where superset_group_id is not null;
