-- Create collections table (image groups)
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,  -- null = public
  
  name text not null,
  slug text not null,
  description text,
  cover_image_url text,
  
  is_public boolean default false,
  category text,                  -- 'girls', 'vibes', 'health', 'party', 'finances', 'books', 'self-improvement'
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(organization_id, slug)   -- unique slug per org (or globally if public)
);

-- Enable RLS
alter table collections enable row level security;

-- Users can view public collections or collections in their organizations
create policy "Users can view public or own collections"
  on collections for select
  using (
    is_public = true 
    or organization_id in (select public.get_user_org_ids())
  );

-- Users can insert collections in their organizations or public collections
create policy "Users can insert collections"
  on collections for insert
  with check (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

-- Users can update collections in their organizations
create policy "Users can update own collections"
  on collections for update
  using (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

-- Users can delete collections in their organizations
create policy "Users can delete own collections"
  on collections for delete
  using (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

-- Trigger for collections updated_at
create trigger set_collections_updated_at
  before update on collections
  for each row execute procedure public.handle_updated_at();

-- Indexes
create index if not exists collections_organization_id_idx on collections(organization_id);
create index if not exists collections_is_public_idx on collections(is_public);
create index if not exists collections_category_idx on collections(category);
