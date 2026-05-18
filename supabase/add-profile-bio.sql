-- Run this once in Supabase SQL Editor before using profile bios.

alter table public.profiles
  add column if not exists bio text;
