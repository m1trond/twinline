-- Run this once in Supabase SQL Editor to track nickname change limits separately from profile name changes.

alter table public.profiles
  add column if not exists username_changed_at timestamptz;
