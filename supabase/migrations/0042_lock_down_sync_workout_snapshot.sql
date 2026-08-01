-- Alinea proyectos donde 0041 se aplicó antes de revocar los grants explícitos
-- creados por los default privileges de Supabase.

revoke all on function public.sync_workout_snapshot(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.sync_workout_snapshot(uuid, jsonb) to authenticated;
