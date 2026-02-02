-- Create organizations table (tenants)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table organizations enable row level security;

-- Note: RLS policy for organizations is created in 003_create_organization_members.sql
-- because it references the organization_members table

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for organizations updated_at
create trigger set_organizations_updated_at
  before update on organizations
  for each row execute procedure public.handle_updated_at();
