-- Message state lives outside public.messages.
-- Run this once in Supabase SQL Editor, then deploy the app code.

create table if not exists public.message_receipts (
  id bigserial primary key,
  message_id bigint not null references public.messages(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('delivered', 'read', 'played')),
  created_at timestamptz not null default now(),
  unique (message_id, sender_id, status)
);

create index if not exists message_receipts_sender_created_at_idx
  on public.message_receipts (sender_id, created_at);

create index if not exists message_receipts_recipient_created_at_idx
  on public.message_receipts (recipient_id, created_at);

create table if not exists public.message_typing_states (
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('start', 'stop')),
  event_at timestamptz not null default now(),
  expires_at timestamptz not null default now(),
  primary key (sender_id, recipient_id)
);

create index if not exists message_typing_states_recipient_idx
  on public.message_typing_states (recipient_id, expires_at);

create table if not exists public.message_pins (
  message_id bigint not null references public.messages(id) on delete cascade,
  pinner_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  is_pinned boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, pinner_id, recipient_id)
);

create index if not exists message_pins_pinner_updated_at_idx
  on public.message_pins (pinner_id, updated_at);

create index if not exists message_pins_recipient_updated_at_idx
  on public.message_pins (recipient_id, updated_at);

alter table public.message_receipts enable row level security;
alter table public.message_typing_states enable row level security;
alter table public.message_pins enable row level security;

drop policy if exists "message_receipts_select_participants" on public.message_receipts;
drop policy if exists "message_receipts_insert_sender" on public.message_receipts;
drop policy if exists "message_receipts_update_sender" on public.message_receipts;

create policy "message_receipts_select_participants"
  on public.message_receipts
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "message_receipts_insert_sender"
  on public.message_receipts
  for insert
  with check (
    auth.uid() = sender_id
    and recipient_id <> auth.uid()
    and exists (
      select 1
      from public.messages
      where messages.id = message_receipts.message_id
        and messages.user_id = message_receipts.recipient_id
        and messages.recipient_id = message_receipts.sender_id
    )
  );

create policy "message_receipts_update_sender"
  on public.message_receipts
  for update
  using (auth.uid() = sender_id)
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.messages
      where messages.id = message_receipts.message_id
        and messages.user_id = message_receipts.recipient_id
        and messages.recipient_id = message_receipts.sender_id
    )
  );

drop policy if exists "message_typing_states_select_participants" on public.message_typing_states;
drop policy if exists "message_typing_states_insert_sender" on public.message_typing_states;
drop policy if exists "message_typing_states_update_sender" on public.message_typing_states;

create policy "message_typing_states_select_participants"
  on public.message_typing_states
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "message_typing_states_insert_sender"
  on public.message_typing_states
  for insert
  with check (
    auth.uid() = sender_id
    and recipient_id <> auth.uid()
  );

create policy "message_typing_states_update_sender"
  on public.message_typing_states
  for update
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

drop policy if exists "message_pins_select_participants" on public.message_pins;
drop policy if exists "message_pins_insert_pinner" on public.message_pins;
drop policy if exists "message_pins_update_pinner" on public.message_pins;

create policy "message_pins_select_participants"
  on public.message_pins
  for select
  using (auth.uid() = pinner_id or auth.uid() = recipient_id);

create policy "message_pins_insert_pinner"
  on public.message_pins
  for insert
  with check (
    auth.uid() = pinner_id
    and recipient_id <> auth.uid()
    and exists (
      select 1
      from public.messages
      where messages.id = message_pins.message_id
        and (
          messages.user_id = message_pins.pinner_id
          or messages.recipient_id = message_pins.pinner_id
        )
        and (
          messages.user_id = message_pins.recipient_id
          or messages.recipient_id = message_pins.recipient_id
        )
    )
  );

create policy "message_pins_update_pinner"
  on public.message_pins
  for update
  using (auth.uid() = pinner_id)
  with check (
    auth.uid() = pinner_id
    and exists (
      select 1
      from public.messages
      where messages.id = message_pins.message_id
        and (
          messages.user_id = message_pins.pinner_id
          or messages.recipient_id = message_pins.pinner_id
        )
        and (
          messages.user_id = message_pins.recipient_id
          or messages.recipient_id = message_pins.recipient_id
        )
    )
  );

alter table public.message_receipts replica identity full;
alter table public.message_typing_states replica identity full;
alter table public.message_pins replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_receipts'
  ) then
    alter publication supabase_realtime add table public.message_receipts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_typing_states'
  ) then
    alter publication supabase_realtime add table public.message_typing_states;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_pins'
  ) then
    alter publication supabase_realtime add table public.message_pins;
  end if;
end $$;
