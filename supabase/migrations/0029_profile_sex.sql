alter table public.profiles
  add column if not exists sex text not null default 'male'
  check (sex in ('male','female'));
