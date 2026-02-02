-- Create organization_members junction table
create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now(),
  unique(organization_id, profile_id)
);

-- Enable RLS
alter table organization_members enable row level security;

-- Users can view members of their organizations
create policy "Users can view members of their organizations"
  on organization_members for select
  using (
    organization_id in (
      select organization_id 
      from organization_members 
      where profile_id = auth.uid()
    )
  );

-- Users can insert members if they are admin or owner
create policy "Admins can add members"
  on organization_members for insert
  with check (
    exists (
      select 1 from organization_members
      where organization_id = organization_members.organization_id
        and profile_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Users can update members if they are admin or owner
create policy "Admins can update members"
  on organization_members for update
  using (
    exists (
      select 1 from organization_members
      where organization_id = organization_members.organization_id
        and profile_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Helper function: get user's organization IDs
create or replace function public.get_user_org_ids()
returns setof uuid as $$
  select organization_id 
  from organization_members 
  where profile_id = auth.uid()
$$ language sql security definer;

-- Now create organizations RLS policy (after organization_members exists)
create policy "Users can view their organizations"
  on organizations for select
  using (
    id in (
      select organization_id 
      from organization_members 
      where profile_id = auth.uid()
    )
  );
