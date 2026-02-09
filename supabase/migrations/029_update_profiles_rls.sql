-- Update profiles RLS to allow organization members to view each other
create policy "Users can view profiles of their organization members"
  on profiles for select
  using (
    exists (
      select 1 
      from organization_members my_orgs
      join organization_members other_orgs 
        on my_orgs.organization_id = other_orgs.organization_id
      where my_orgs.profile_id = auth.uid()
        and other_orgs.profile_id = profiles.id
    )
  );
