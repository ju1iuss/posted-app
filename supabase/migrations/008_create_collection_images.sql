-- Create collection_images junction table
create table if not exists collection_images (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  image_id uuid not null references images(id) on delete cascade,
  position int default 0,
  created_at timestamptz default now(),
  unique(collection_id, image_id)
);

-- Enable RLS
alter table collection_images enable row level security;

-- Users can view collection_images for collections they can access
create policy "Users can view collection_images for accessible collections"
  on collection_images for select
  using (
    collection_id in (
      select id from collections
      where is_public = true 
        or organization_id in (select public.get_user_org_ids())
    )
  );

-- Users can insert collection_images for collections they can modify
create policy "Users can insert collection_images"
  on collection_images for insert
  with check (
    collection_id in (
      select id from collections
      where organization_id in (select public.get_user_org_ids())
    )
  );

-- Users can update collection_images for collections they can modify
create policy "Users can update collection_images"
  on collection_images for update
  using (
    collection_id in (
      select id from collections
      where organization_id in (select public.get_user_org_ids())
    )
  );

-- Users can delete collection_images for collections they can modify
create policy "Users can delete collection_images"
  on collection_images for delete
  using (
    collection_id in (
      select id from collections
      where organization_id in (select public.get_user_org_ids())
    )
  );

-- Indexes
create index if not exists collection_images_collection_id_idx on collection_images(collection_id);
create index if not exists collection_images_image_id_idx on collection_images(image_id);
create index if not exists collection_images_position_idx on collection_images(position);
