-- Create images table (uploaded + AI generated)
create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,  -- null for public
  
  storage_path text not null,     -- path in Supabase storage bucket
  url text not null,              -- public URL
  filename text,
  
  source text default 'upload' check (source in ('upload', 'ai_generated', 'collection')),
  prompt text,                    -- AI generation prompt if applicable
  
  width int,
  height int,
  size_bytes int,
  mime_type text,
  
  tags text[],                    -- searchable tags: ['lifestyle', 'product']
  metadata jsonb default '{}',
  
  created_at timestamptz default now()
);

-- Enable RLS
alter table images enable row level security;

-- Users can view images in their organizations or public images
create policy "Users can view images in their orgs or public"
  on images for select
  using (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

-- Users can insert images in their organizations
create policy "Users can insert images in their orgs"
  on images for insert
  with check (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

-- Users can update images in their organizations
create policy "Users can update images in their orgs"
  on images for update
  using (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

-- Users can delete images in their organizations
create policy "Users can delete images in their orgs"
  on images for delete
  using (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

-- Indexes
create index if not exists images_organization_id_idx on images(organization_id);
create index if not exists images_source_idx on images(source);
create index if not exists images_tags_idx on images using gin(tags);
