-- Create brands table for organizing accounts
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  color text default '#6b7280', -- gray by default, for folder icon color
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add brand_id to accounts table
alter table accounts add column if not exists brand_id uuid references brands(id) on delete set null;

-- Update accounts status to include new values
-- First drop the existing constraint
alter table accounts drop constraint if exists accounts_status_check;

-- Add new constraint with all status values
alter table accounts add constraint accounts_status_check 
  check (status in ('planning', 'warming_up', 'active', 'not_active', 'paused'));

-- Enable RLS on brands
alter table brands enable row level security;

-- RLS policies for brands
create policy "Users can view brands in their orgs"
  on brands for select
  using (organization_id in (select public.get_user_org_ids()));

create policy "Users can insert brands in their orgs"
  on brands for insert
  with check (organization_id in (select public.get_user_org_ids()));

create policy "Users can update brands in their orgs"
  on brands for update
  using (organization_id in (select public.get_user_org_ids()));

create policy "Users can delete brands in their orgs"
  on brands for delete
  using (organization_id in (select public.get_user_org_ids()));

-- Trigger for brands updated_at
create trigger set_brands_updated_at
  before update on brands
  for each row execute procedure public.handle_updated_at();

-- Indexes
create index if not exists brands_organization_id_idx on brands(organization_id);
create index if not exists accounts_brand_id_idx on accounts(brand_id);
