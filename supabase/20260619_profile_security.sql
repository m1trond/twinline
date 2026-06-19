-- Run this once in Supabase SQL Editor.
-- Hardens public.profiles so profile writes are tied to auth.uid(), not client trust.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "profiles_delete_own"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if tg_op = 'INSERT' then
    if new.user_id <> auth.uid() then
      raise exception 'Profile user_id must match the authenticated user.';
    end if;

    new.display_name = nullif(trim(coalesce(new.display_name, '')), '');
    new.username = nullif(lower(trim(coalesce(new.username, ''))), '');
    new.bio = nullif(trim(coalesce(new.bio, '')), '');

    if new.display_name is null or char_length(new.display_name) < 2 or char_length(new.display_name) > 24 then
      raise exception 'Display name must be between 2 and 24 characters.';
    end if;

    if new.username is not null and new.username !~ '^[a-z0-9_]{3,24}$' then
      raise exception 'Username format is invalid.';
    end if;

    if char_length(coalesce(new.bio, '')) > 100 then
      raise exception 'Bio must be 100 characters or less.';
    end if;

    new.updated_at = coalesce(new.updated_at, now());
    return new;
  end if;

  if new.user_id <> old.user_id or old.user_id <> auth.uid() then
    raise exception 'Profile user_id cannot be changed.';
  end if;

  new.display_name = nullif(trim(coalesce(new.display_name, '')), '');
  new.username = nullif(lower(trim(coalesce(new.username, ''))), '');
  new.bio = nullif(trim(coalesce(new.bio, '')), '');

  if new.display_name is null or char_length(new.display_name) < 2 or char_length(new.display_name) > 24 then
    raise exception 'Display name must be between 2 and 24 characters.';
  end if;

  if new.username is not null and new.username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username format is invalid.';
  end if;

  if char_length(coalesce(new.bio, '')) > 100 then
    raise exception 'Bio must be 100 characters or less.';
  end if;

  if new.username is distinct from old.username then
    if old.username_changed_at is not null and old.username_changed_at > now() - interval '30 days' then
      raise exception 'Username can be changed only once every 30 days.';
    end if;

    new.username_changed_at = now();
  else
    new.username_changed_at = old.username_changed_at;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guard_profile_changes on public.profiles;

create trigger guard_profile_changes
before insert or update on public.profiles
for each row
execute function public.guard_profile_changes();
