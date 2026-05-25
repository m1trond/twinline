create table if not exists public.user_sync_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_sync_states enable row level security;

drop policy if exists "user_sync_states_select_own" on public.user_sync_states;
drop policy if exists "user_sync_states_insert_own" on public.user_sync_states;
drop policy if exists "user_sync_states_update_own" on public.user_sync_states;

create policy "user_sync_states_select_own"
  on public.user_sync_states
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_sync_states_insert_own"
  on public.user_sync_states
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_sync_states_update_own"
  on public.user_sync_states
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_user_sync_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_sync_states_updated_at on public.user_sync_states;

create trigger touch_user_sync_states_updated_at
before update on public.user_sync_states
for each row
execute function public.touch_user_sync_states_updated_at();
