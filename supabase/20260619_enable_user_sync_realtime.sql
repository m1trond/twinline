-- Run this once in Supabase SQL Editor.
-- It lets Supabase Realtime broadcast account sync updates between devices.

alter table public.user_sync_states replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_sync_states'
  ) then
    alter publication supabase_realtime add table public.user_sync_states;
  end if;
end $$;
