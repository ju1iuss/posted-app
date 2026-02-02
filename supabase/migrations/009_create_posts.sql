-- Create posts table (carousels, videos, etc.)
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  strategy_id uuid references strategies(id) on delete set null,
  
  type text not null check (type in ('carousel', 'video', 'image')),
  title text,
  caption text,
  hashtags text[],
  
  -- Flexible content structure for carousel slides, hooks, etc.
  content jsonb default '{}',
  /*
    Example carousel content:
    {
      "slides": [
        {"position": 1, "hook": "Stop scrolling!", "body": "Here's why...", "image_id": "uuid"},
        {"position": 2, "body": "Point 1", "image_id": "uuid"}
      ],
      "cta": "Follow for more"
    }
  */
  
  video_url text,                 -- for video posts (storage bucket path)
  
  status text default 'draft' check (status in ('draft', 'ready', 'exported', 'posted')),
  exported_at timestamptz,
  posted_at timestamptz,
  
  -- Future: engagement metrics from TikTok API
  metrics jsonb default '{}',     -- {"views": 0, "likes": 0, "comments": 0}
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table posts enable row level security;

-- Users can view posts for accounts in their organizations
create policy "Users can view posts in their orgs"
  on posts for select
  using (
    account_id in (
      select id from accounts
      where organization_id in (select public.get_user_org_ids())
    )
  );

-- Users can insert posts for accounts in their organizations
create policy "Users can insert posts in their orgs"
  on posts for insert
  with check (
    account_id in (
      select id from accounts
      where organization_id in (select public.get_user_org_ids())
    )
  );

-- Users can update posts for accounts in their organizations
create policy "Users can update posts in their orgs"
  on posts for update
  using (
    account_id in (
      select id from accounts
      where organization_id in (select public.get_user_org_ids())
    )
  );

-- Users can delete posts for accounts in their organizations
create policy "Users can delete posts in their orgs"
  on posts for delete
  using (
    account_id in (
      select id from accounts
      where organization_id in (select public.get_user_org_ids())
    )
  );

-- Trigger for posts updated_at
create trigger set_posts_updated_at
  before update on posts
  for each row execute procedure public.handle_updated_at();

-- Indexes
create index if not exists posts_account_id_idx on posts(account_id);
create index if not exists posts_strategy_id_idx on posts(strategy_id);
create index if not exists posts_status_idx on posts(status);
create index if not exists posts_type_idx on posts(type);
create index if not exists posts_created_at_idx on posts(created_at desc);
