-- Run this once in Supabase SQL Editor.
-- It lets only the profile with username 'kermetrate' read the access list.

create or replace function public.get_access_profiles()
returns table (
  user_id uuid,
  display_name text,
  username text,
  email text,
  phone text,
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
      nullif(auth_user.email, ''),
      nullif(auth_user.phone, '')
    ) as display_name,
    profile.username,
    auth_user.email,
    auth_user.phone,
    auth_user.created_at,
    profile.updated_at
  from auth.users auth_user
  left join public.profiles profile
    on profile.user_id = auth_user.id
  where exists (
    select 1
    from public.profiles owner_profile
    where owner_profile.user_id = auth.uid()
      and lower(owner_profile.username) = 'kermetrate'
  )
  order by auth_user.created_at desc;
$$;

revoke all on function public.get_access_profiles() from public;
grant execute on function public.get_access_profiles() to authenticated;
