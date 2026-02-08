-- Allow viewing images referenced by public templates or collections
-- This migration updates RLS policies to make images accessible when they're
-- used in public templates or collections, without making all images public

-- Drop the existing images SELECT policy
drop policy if exists "Users can view images in their orgs or public" on images;

-- Create new policy that includes images referenced by public templates/collections
create policy "Users can view images in their orgs or public or referenced by public content"
  on images for select
  using (
    -- Public images (organization_id is null)
    organization_id is null 
    -- Images in user's organizations
    or organization_id in (select public.get_user_org_ids())
    -- Images referenced by public templates (via template_layers)
    or id in (
      select distinct image_id 
      from template_layers 
      where image_id is not null
        and slide_id in (
          select id from template_slides
          where template_id in (
            select id from templates where is_premade = true
          )
        )
    )
    -- Images referenced by public templates (via template_slides background)
    or id in (
      select distinct background_image_id 
      from template_slides 
      where background_image_id is not null
        and template_id in (
          select id from templates where is_premade = true
        )
    )
    -- Images in public collections
    or id in (
      select distinct image_id 
      from collection_images 
      where collection_id in (
        select id from collections where is_public = true
      )
    )
    -- Images referenced by collections used in public templates
    or id in (
      select distinct ci.image_id 
      from collection_images ci
      join template_layers tl on tl.image_collection_id = ci.collection_id
      where ci.image_id is not null
        and tl.slide_id in (
          select id from template_slides
          where template_id in (
            select id from templates where is_premade = true
          )
        )
    )
  );

-- Update storage bucket policy to allow viewing images referenced by public content
-- Drop existing SELECT policy
drop policy if exists "Users can view images in their org or public" on storage.objects;

-- Create new policy that includes images referenced by public templates/collections
create policy "Users can view images in their org or public or referenced by public content"
  on storage.objects for select
  using (
    bucket_id = 'images' 
    AND (
      -- Public folder
      (storage.foldername(name))[1] = 'public' 
      -- User's org folders
      OR (storage.foldername(name))[1] IN (SELECT public.get_user_org_ids()::text)
      -- Images referenced by public templates (check via images table)
      OR name IN (
        select storage_path 
        from images 
        where id in (
          -- Images in template_layers of public templates
          select distinct image_id 
          from template_layers 
          where image_id is not null
            and slide_id in (
              select id from template_slides
              where template_id in (
                select id from templates where is_premade = true
              )
            )
          UNION
          -- Images in template_slides backgrounds of public templates
          select distinct background_image_id 
          from template_slides 
          where background_image_id is not null
            and template_id in (
              select id from templates where is_premade = true
            )
          UNION
          -- Images in public collections
          select distinct image_id 
          from collection_images 
          where collection_id in (
            select id from collections where is_public = true
          )
          UNION
          -- Images in collections used by public templates
          select distinct ci.image_id 
          from collection_images ci
          join template_layers tl on tl.image_collection_id = ci.collection_id
          where ci.image_id is not null
            and tl.slide_id in (
              select id from template_slides
              where template_id in (
                select id from templates where is_premade = true
              )
            )
        )
      )
    )
  );
