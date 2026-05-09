-- Run this once in Supabase SQL Editor before deploying the app code.
-- It makes messages private: only sender and recipient can read/delete a direct message.

alter table public.messages
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade;

create index if not exists messages_user_id_created_at_idx
  on public.messages (user_id, created_at);

create index if not exists messages_recipient_id_created_at_idx
  on public.messages (recipient_id, created_at);

alter table public.messages enable row level security;

-- Replace any old broad message policies, because a permissive SELECT policy would still leak chats.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
  loop
    execute format('drop policy if exists %I on public.messages', policy_record.policyname);
  end loop;
end $$;

create policy "messages_select_direct_participants"
  on public.messages
  for select
  using (auth.uid() = user_id or auth.uid() = recipient_id);

create policy "messages_insert_own_direct"
  on public.messages
  for insert
  with check (
    auth.uid() = user_id
    and recipient_id is not null
    and recipient_id <> auth.uid()
  );

create policy "messages_update_own"
  on public.messages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "messages_delete_direct_participants"
  on public.messages
  for delete
  using (auth.uid() = user_id or auth.uid() = recipient_id);
