-- Run this once in Supabase SQL Editor.
-- Access is controlled by immutable auth.users.id values, not by public usernames.
-- If the owner email is different, replace it in the seed insert below before running.

create table if not exists public.access_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.access_admins enable row level security;

revoke all on table public.access_admins from public;
revoke all on table public.access_admins from anon;
revoke all on table public.access_admins from authenticated;

insert into public.access_admins (user_id)
select auth_user.id
from auth.users auth_user
where lower(auth_user.email) = 'mltrond.triumf@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.is_access_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.access_admins admin
    where admin.user_id = auth.uid()
  );
$$;

revoke all on function public.is_access_admin() from public;
grant execute on function public.is_access_admin() to authenticated;

create or replace function public.get_access_profiles()
returns table (
  user_id uuid,
  display_name text,
  username text,
  email text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    auth_user.id as user_id,
    coalesce(
      nullif(profile.display_name, ''),
      nullif(auth_user.raw_user_meta_data ->> 'display_name', ''),
      nullif(auth_user.email, '')
    ) as display_name,
    profile.username,
    auth_user.email,
    auth_user.created_at,
    profile.updated_at
  from auth.users auth_user
  left join public.profiles profile
    on profile.user_id = auth_user.id
  where public.is_access_admin()
  order by auth_user.created_at desc;
$$;

revoke all on function public.get_access_profiles() from public;
grant execute on function public.get_access_profiles() to authenticated;

create or replace function public.delete_access_profile(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_access_admin() or target_user_id is null or target_user_id = auth.uid() then
    return false;
  end if;

  delete from public.call_signals
  where sender_id = target_user_id
     or receiver_id = target_user_id;

  delete from public.messages
  where user_id = target_user_id
     or recipient_id = target_user_id;

  delete from public.profiles
  where user_id = target_user_id;

  delete from public.access_admins
  where user_id = target_user_id;

  delete from auth.users
  where id = target_user_id;

  return true;
end;
$$;

revoke all on function public.delete_access_profile(uuid) from public;
grant execute on function public.delete_access_profile(uuid) to authenticated;
