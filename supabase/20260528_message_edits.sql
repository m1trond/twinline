-- Run this once in Supabase SQL Editor before using edited message labels.

alter table public.messages
  add column if not exists edited_at timestamptz;

create index if not exists messages_edited_at_idx
  on public.messages (edited_at);
