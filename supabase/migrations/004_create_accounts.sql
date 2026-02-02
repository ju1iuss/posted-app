-- Create accounts table (TikTok theme accounts)
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  username text,
  theme text,
  niche text,
  prompt text,                    -- default AI prompt for content generation
  notes text,
  status text default 'planning' check (status in ('planning', 'active', 'paused', 'archived')),
  metadata jsonb default '{}',    -- flexible: warmup progress, tiktok api data later
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table accounts enable row level security;

-- Users can view accounts in their organizations
create policy "Users can view accounts in their orgs"
  on accounts for select
  using (organization_id in (select public.get_user_org_ids()));

-- Users can insert accounts in their organizations
create policy "Users can insert accounts in their orgs"
  on accounts for insert
  with check (organization_id in (select public.get_user_org_ids()));

-- Users can update accounts in their organizations
create policy "Users can update accounts in their orgs"
  on accounts for update
  using (organization_id in (select public.get_user_org_ids()));

-- Users can delete accounts in their organizations
create policy "Users can delete accounts in their orgs"
  on accounts for delete
  using (organization_id in (select public.get_user_org_ids()));

-- Trigger for accounts updated_at
create trigger set_accounts_updated_at
  before update on accounts
  for each row execute procedure public.handle_updated_at();

-- Index for faster lookups
create index if not exists accounts_organization_id_idx on accounts(organization_id);
create index if not exists accounts_status_idx on accounts(status);
