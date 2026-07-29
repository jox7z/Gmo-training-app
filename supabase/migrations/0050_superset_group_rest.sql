-- Recuperada desde supabase_migrations.schema_migrations (version 20260725035216)
-- tras el borrado accidental del working tree el 2026-07-29.
alter table public.routine_day_exercises
  add column group_rest_enabled boolean not null default false;

alter table public.workout_exercises
  add column group_rest_enabled boolean not null default false;
