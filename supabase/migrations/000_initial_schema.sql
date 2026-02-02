-- Consolidated Initial Schema Migration
-- This file contains all migrations in order for easy setup
-- Run this file in Supabase SQL Editor for initial setup

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- 2. ORGANIZATIONS TABLE
-- ============================================
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS but don't create policies yet (they reference organization_members)
alter table organizations enable row level security;

create trigger set_organizations_updated_at
  before update on organizations
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- 3. ORGANIZATION MEMBERS TABLE
-- ============================================
create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now(),
  unique(organization_id, profile_id)
);

alter table organization_members enable row level security;

-- Helper function first (uses SECURITY DEFINER to bypass RLS)
create or replace function public.get_user_org_ids()
returns setof uuid as $$
  select organization_id 
  from organization_members 
  where profile_id = auth.uid()
$$ language sql security definer;

-- Organization members policies (avoid self-reference with SECURITY DEFINER function)
create policy "Users can view members in their orgs"
  on organization_members for select
  using (organization_id in (select public.get_user_org_ids()));

-- Users can add themselves as owner (for new org creation)
create policy "Users can add themselves as owner"
  on organization_members for insert
  with check (
    auth.uid() IS NOT NULL 
    AND profile_id = auth.uid()
  );

-- Admins can add other members
create policy "Admins can add other members"
  on organization_members for insert
  with check (
    organization_id in (
      select om.organization_id from organization_members om
      where om.profile_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

create policy "Admins can update members"
  on organization_members for update
  using (
    organization_id in (
      select om.organization_id from organization_members om
      where om.profile_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

create policy "Admins can delete members"
  on organization_members for delete
  using (
    organization_id in (
      select om.organization_id from organization_members om
      where om.profile_id = auth.uid() and om.role in ('owner', 'admin')
    )
    OR profile_id = auth.uid()
  );

-- Organizations policies (using helper function to avoid recursion)
create policy "Users can view their organizations"
  on organizations for select
  using (id in (select public.get_user_org_ids()));

-- Allow any authenticated user to create an organization
create policy "Users can create organizations"
  on organizations for insert
  with check (auth.uid() IS NOT NULL);

-- Allow admins/owners to update their organizations
create policy "Admins can update organizations"
  on organizations for update
  using (
    id in (
      select om.organization_id from organization_members om
      where om.profile_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- ============================================
-- 4. ACCOUNTS TABLE
-- ============================================
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  username text,
  theme text,
  niche text,
  prompt text,
  notes text,
  status text default 'planning' check (status in ('planning', 'active', 'paused', 'archived')),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table accounts enable row level security;

create policy "Users can view accounts in their orgs"
  on accounts for select
  using (organization_id in (select public.get_user_org_ids()));

create policy "Users can insert accounts in their orgs"
  on accounts for insert
  with check (organization_id in (select public.get_user_org_ids()));

create policy "Users can update accounts in their orgs"
  on accounts for update
  using (organization_id in (select public.get_user_org_ids()));

create policy "Users can delete accounts in their orgs"
  on accounts for delete
  using (organization_id in (select public.get_user_org_ids()));

create trigger set_accounts_updated_at
  before update on accounts
  for each row execute procedure public.handle_updated_at();

create index if not exists accounts_organization_id_idx on accounts(organization_id);
create index if not exists accounts_status_idx on accounts(status);

-- ============================================
-- 5. STRATEGIES TABLE
-- ============================================
create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  name text not null,
  description text,
  target_audience text,
  tone_guidelines text,
  content_themes text[],
  hashtag_sets jsonb,
  posting_schedule jsonb,
  recommendations text,
  status text default 'draft' check (status in ('draft', 'active', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table strategies enable row level security;

create policy "Users can view strategies in their orgs"
  on strategies for select
  using (organization_id in (select public.get_user_org_ids()));

create policy "Users can insert strategies in their orgs"
  on strategies for insert
  with check (organization_id in (select public.get_user_org_ids()));

create policy "Users can update strategies in their orgs"
  on strategies for update
  using (organization_id in (select public.get_user_org_ids()));

create policy "Users can delete strategies in their orgs"
  on strategies for delete
  using (organization_id in (select public.get_user_org_ids()));

create trigger set_strategies_updated_at
  before update on strategies
  for each row execute procedure public.handle_updated_at();

create index if not exists strategies_organization_id_idx on strategies(organization_id);
create index if not exists strategies_account_id_idx on strategies(account_id);
create index if not exists strategies_status_idx on strategies(status);

-- ============================================
-- 6. IMAGES TABLE
-- ============================================
create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  storage_path text not null,
  url text not null,
  filename text,
  source text default 'upload' check (source in ('upload', 'ai_generated', 'collection')),
  prompt text,
  width int,
  height int,
  size_bytes int,
  mime_type text,
  tags text[],
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table images enable row level security;

create policy "Users can view images in their orgs or public"
  on images for select
  using (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

create policy "Users can insert images in their orgs"
  on images for insert
  with check (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

create policy "Users can update images in their orgs"
  on images for update
  using (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

create policy "Users can delete images in their orgs"
  on images for delete
  using (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

create index if not exists images_organization_id_idx on images(organization_id);
create index if not exists images_source_idx on images(source);
create index if not exists images_tags_idx on images using gin(tags);

-- ============================================
-- 7. COLLECTIONS TABLE
-- ============================================
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  cover_image_url text,
  is_public boolean default false,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, slug)
);

alter table collections enable row level security;

create policy "Users can view public or own collections"
  on collections for select
  using (
    is_public = true 
    or organization_id in (select public.get_user_org_ids())
  );

create policy "Users can insert collections"
  on collections for insert
  with check (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

create policy "Users can update own collections"
  on collections for update
  using (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

create policy "Users can delete own collections"
  on collections for delete
  using (
    organization_id is null 
    or organization_id in (select public.get_user_org_ids())
  );

create trigger set_collections_updated_at
  before update on collections
  for each row execute procedure public.handle_updated_at();

create index if not exists collections_organization_id_idx on collections(organization_id);
create index if not exists collections_is_public_idx on collections(is_public);
create index if not exists collections_category_idx on collections(category);

-- ============================================
-- 8. COLLECTION IMAGES TABLE
-- ============================================
create table if not exists collection_images (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  image_id uuid not null references images(id) on delete cascade,
  position int default 0,
  created_at timestamptz default now(),
  unique(collection_id, image_id)
);

alter table collection_images enable row level security;

create policy "Users can view collection_images for accessible collections"
  on collection_images for select
  using (
    collection_id in (
      select id from collections
      where is_public = true 
        or organization_id in (select public.get_user_org_ids())
    )
  );

create policy "Users can insert collection_images"
  on collection_images for insert
  with check (
    collection_id in (
      select id from collections
      where organization_id in (select public.get_user_org_ids())
    )
  );

create policy "Users can update collection_images"
  on collection_images for update
  using (
    collection_id in (
      select id from collections
      where organization_id in (select public.get_user_org_ids())
    )
  );

create policy "Users can delete collection_images"
  on collection_images for delete
  using (
    collection_id in (
      select id from collections
      where organization_id in (select public.get_user_org_ids())
    )
  );

create index if not exists collection_images_collection_id_idx on collection_images(collection_id);
create index if not exists collection_images_image_id_idx on collection_images(image_id);
create index if not exists collection_images_position_idx on collection_images(position);

-- ============================================
-- 9. POSTS TABLE
-- ============================================
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  strategy_id uuid references strategies(id) on delete set null,
  type text not null check (type in ('carousel', 'video', 'image')),
  title text,
  caption text,
  hashtags text[],
  content jsonb default '{}',
  video_url text,
  status text default 'draft' check (status in ('draft', 'ready', 'exported', 'posted')),
  exported_at timestamptz,
  posted_at timestamptz,
  metrics jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table posts enable row level security;

create policy "Users can view posts in their orgs"
  on posts for select
  using (
    account_id in (
      select id from accounts
      where organization_id in (select public.get_user_org_ids())
    )
  );

create policy "Users can insert posts in their orgs"
  on posts for insert
  with check (
    account_id in (
      select id from accounts
      where organization_id in (select public.get_user_org_ids())
    )
  );

create policy "Users can update posts in their orgs"
  on posts for update
  using (
    account_id in (
      select id from accounts
      where organization_id in (select public.get_user_org_ids())
    )
  );

create policy "Users can delete posts in their orgs"
  on posts for delete
  using (
    account_id in (
      select id from accounts
      where organization_id in (select public.get_user_org_ids())
    )
  );

create trigger set_posts_updated_at
  before update on posts
  for each row execute procedure public.handle_updated_at();

create index if not exists posts_account_id_idx on posts(account_id);
create index if not exists posts_strategy_id_idx on posts(strategy_id);
create index if not exists posts_status_idx on posts(status);
create index if not exists posts_type_idx on posts(type);
create index if not exists posts_created_at_idx on posts(created_at desc);

-- ============================================
-- 10. POST IMAGES TABLE
-- ============================================
create table if not exists post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  image_id uuid not null references images(id) on delete cascade,
  position int default 0,
  created_at timestamptz default now(),
  unique(post_id, image_id)
);

alter table post_images enable row level security;

create policy "Users can view post_images for accessible posts"
  on post_images for select
  using (
    post_id in (
      select id from posts
      where account_id in (
        select id from accounts
        where organization_id in (select public.get_user_org_ids())
      )
    )
  );

create policy "Users can insert post_images"
  on post_images for insert
  with check (
    post_id in (
      select id from posts
      where account_id in (
        select id from accounts
        where organization_id in (select public.get_user_org_ids())
      )
    )
  );

create policy "Users can update post_images"
  on post_images for update
  using (
    post_id in (
      select id from posts
      where account_id in (
        select id from accounts
        where organization_id in (select public.get_user_org_ids())
      )
    )
  );

create policy "Users can delete post_images"
  on post_images for delete
  using (
    post_id in (
      select id from posts
      where account_id in (
        select id from accounts
        where organization_id in (select public.get_user_org_ids())
      )
    )
  );

create index if not exists post_images_post_id_idx on post_images(post_id);
create index if not exists post_images_image_id_idx on post_images(image_id);
create index if not exists post_images_position_idx on post_images(position);

-- ============================================
-- 11. SEED PUBLIC COLLECTIONS
-- ============================================
insert into collections (name, slug, description, category, is_public, organization_id)
values
  ('Girls', 'girls', 'Lifestyle and fashion content for female audiences', 'girls', true, null),
  ('Vibes', 'vibes', 'Aesthetic and mood-based imagery', 'vibes', true, null),
  ('Health', 'health', 'Fitness, wellness, and healthy living content', 'health', true, null),
  ('Party', 'party', 'Nightlife, events, and celebration imagery', 'party', true, null),
  ('Finances', 'finances', 'Money, investing, and financial education content', 'finances', true, null),
  ('Books', 'books', 'Reading, literature, and book-related imagery', 'books', true, null),
  ('Self Improvement', 'self-improvement', 'Personal growth, motivation, and development content', 'self-improvement', true, null)
on conflict do nothing;
