create or replace function public.delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if v_uid <> p_user_id then
    raise exception 'No puedes borrar una cuenta ajena'
      using errcode = '42501';
  end if;

  update public.exercises set created_by = null where created_by = p_user_id;
  delete from public.post_comments where user_id = p_user_id;
  delete from public.post_reactions where user_id = p_user_id;
  delete from public.notifications
    where recipient_id = p_user_id or actor_id = p_user_id;
  delete from public.posts where user_id = p_user_id;
  delete from public.follows
    where follower_id = p_user_id or following_id = p_user_id;
  delete from public.event_comments where user_id = p_user_id;
  delete from public.event_participants where user_id = p_user_id;
  delete from public.community_members where user_id = p_user_id;
  delete from public.events where creator_id = p_user_id;
  delete from public.communities where creator_id = p_user_id;
  delete from public.workouts where user_id = p_user_id;
  delete from public.routines where user_id = p_user_id;
  delete from public.body_measurements where user_id = p_user_id;
  delete from public.weekly_stats where user_id = p_user_id;
  delete from public.streaks where user_id = p_user_id;
  delete from public.rank_history where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;

  begin
    delete from auth.users where id = p_user_id;
  exception
    when insufficient_privilege then
      raise warning
        'delete_user_account: sin privilegio sobre auth.users (%)',
        p_user_id;
  end;
end;
$$;

comment on function public.delete_user_account(uuid) is
  'Borra de forma atomica todos los datos del usuario autenticado y su fila en auth.users. Solo puede borrarse a si mismo.';

revoke all on function public.delete_user_account(uuid) from public;
revoke all on function public.delete_user_account(uuid) from anon;
grant execute on function public.delete_user_account(uuid) to authenticated;
