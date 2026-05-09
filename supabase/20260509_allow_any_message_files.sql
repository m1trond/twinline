-- Run this once in Supabase SQL Editor if regular files fail to upload.
-- It allows the existing message-images bucket to store any attachment type up to 50 MB.

update storage.buckets
set
  allowed_mime_types = null,
  file_size_limit = 52428800
where id = 'message-images';
