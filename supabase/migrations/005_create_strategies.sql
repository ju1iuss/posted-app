-- Create strategies table (full content calendar)
create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,  -- optional link to account
  name text not null,
  description text,
  target_audience text,
  tone_guidelines text,
  content_themes text[],          -- array of themes: ['motivation', 'finance tips']
  hashtag_sets jsonb,             -- {"primary": ["#fyp"], "niche": ["#moneytok"]}
  posting_schedule jsonb,         -- {"frequency": "daily", "best_times": ["9am", "6pm"]}
  recommendations text,           -- AI-generated strategy text
  status text default 'draft' check (status in ('draft', 'active', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table strategies enable row level security;

-- Users can view strategies in their organizations
create policy "Users can view strategies in their orgs"
  on strategies for select
  using (organization_id in (select public.get_user_org_ids()));

-- Users can insert strategies in their organizations
create policy "Users can insert strategies in their orgs"
  on strategies for insert
  with check (organization_id in (select public.get_user_org_ids()));

-- Users can update strategies in their organizations
create policy "Users can update strategies in their orgs"
  on strategies for update
  using (organization_id in (select public.get_user_org_ids()));

-- Users can delete strategies in their organizations
create policy "Users can delete strategies in their orgs"
  on strategies for delete
  using (organization_id in (select public.get_user_org_ids()));

-- Trigger for strategies updated_at
create trigger set_strategies_updated_at
  before update on strategies
  for each row execute procedure public.handle_updated_at();

-- Indexes
create index if not exists strategies_organization_id_idx on strategies(organization_id);
create index if not exists strategies_account_id_idx on strategies(account_id);
create index if not exists strategies_status_idx on strategies(status);
