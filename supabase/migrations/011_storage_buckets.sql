-- Storage bucket policies for images
-- Note: These need to be run in Supabase Dashboard > Storage or via Supabase CLI
-- This file documents the bucket structure and policies

/*
Storage Buckets Structure:
- images/ (public bucket)
  ├── {organization_id}/
  │   ├── uploads/          -- user uploaded images
  │   └── generated/        -- AI generated images
  └── public/               -- public collection images

- exports/ (private bucket)
  └── {organization_id}/
      └── posts/            -- exported carousel images/videos
*/

-- Create storage buckets (run these in Supabase Dashboard > Storage)
-- Or use Supabase CLI: supabase storage create images --public
-- supabase storage create exports

/*
Storage Policies for 'images' bucket:

Policy: "Users can upload to their org folder"
INSERT policy:
  bucket_id = 'images'
  name = 'Users can upload to their org folder'
  definition: (bucket_id = 'images' AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text))

Policy: "Users can view images in their org or public"
SELECT policy:
  bucket_id = 'images'
  name = 'Users can view images in their org or public'
  definition: (bucket_id = 'images' AND ((storage.foldername(name))[1] = 'public' OR (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text)))

Policy: "Users can update images in their org"
UPDATE policy:
  bucket_id = 'images'
  name = 'Users can update images in their org'
  definition: (bucket_id = 'images' AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text))

Policy: "Users can delete images in their org"
DELETE policy:
  bucket_id = 'images'
  name = 'Users can delete images in their org'
  definition: (bucket_id = 'images' AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text))

Storage Policies for 'exports' bucket:

Policy: "Users can upload exports to their org folder"
INSERT policy:
  bucket_id = 'exports'
  name = 'Users can upload exports to their org folder'
  definition: (bucket_id = 'exports' AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text))

Policy: "Users can view exports in their org"
SELECT policy:
  bucket_id = 'exports'
  name = 'Users can view exports in their org'
  definition: (bucket_id = 'exports' AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text))

Policy: "Users can delete exports in their org"
DELETE policy:
  bucket_id = 'exports'
  name = 'Users can delete exports in their org'
  definition: (bucket_id = 'exports' AND (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text))
*/
