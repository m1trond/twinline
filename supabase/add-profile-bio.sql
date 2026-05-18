-- Run this once in Supabase SQL Editor before using profile bios.

alter table public.profiles
  add column if not exists bio text;

alter table public.profiles
  drop constraint if exists profiles_bio_length_check;

alter table public.profiles
  add constraint profiles_bio_length_check
  check (char_length(coalesce(bio, '')) <= 100);
