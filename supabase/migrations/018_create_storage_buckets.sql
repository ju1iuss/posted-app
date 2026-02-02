-- Create storage buckets and policies
-- This migration creates the storage buckets and sets up RLS policies

-- Create 'images' bucket (public)
-- Note: If bucket already exists, this will be a no-op
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Create 'exports' bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exports',
  'exports',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do nothing;

-- ============================================
-- Storage Policies for 'images' bucket
-- ============================================

-- Policy: Users can upload to their org folder
drop policy if exists "Users can upload to their org folder" on storage.objects;
create policy "Users can upload to their org folder"
on storage.objects for insert
with check (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text)
);

-- Policy: Users can view images in their org or public
drop policy if exists "Users can view images in their org or public" on storage.objects;
create policy "Users can view images in their org or public"
on storage.objects for select
using (
  bucket_id = 'images' 
  AND (
    (storage.foldername(name))[1] = 'public' 
    OR (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text)
  )
);

-- Policy: Users can update images in their org
drop policy if exists "Users can update images in their org" on storage.objects;
create policy "Users can update images in their org"
on storage.objects for update
using (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text)
);

-- Policy: Users can delete images in their org
drop policy if exists "Users can delete images in their org" on storage.objects;
create policy "Users can delete images in their org"
on storage.objects for delete
using (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text)
);

-- ============================================
-- Storage Policies for 'exports' bucket
-- ============================================

-- Policy: Users can upload exports to their org folder
drop policy if exists "Users can upload exports to their org folder" on storage.objects;
create policy "Users can upload exports to their org folder"
on storage.objects for insert
with check (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text)
);

-- Policy: Users can view exports in their org
drop policy if exists "Users can view exports in their org" on storage.objects;
create policy "Users can view exports in their org"
on storage.objects for select
using (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text)
);

-- Policy: Users can update exports in their org
drop policy if exists "Users can update exports in their org" on storage.objects;
create policy "Users can update exports in their org"
on storage.objects for update
using (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text)
);

-- Policy: Users can delete exports in their org
drop policy if exists "Users can delete exports in their org" on storage.objects;
create policy "Users can delete exports in their org"
on storage.objects for delete
using (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text)
);
