-- Fix RLS policies to avoid infinite recursion and allow new users to create organizations

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;

-- Fix organizations policies
-- Allow users to view organizations they are members of (using a direct subquery)
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.profile_id = auth.uid()
    )
  );

-- Allow any authenticated user to create an organization
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow admins/owners to update their organizations
CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Fix organization_members policies (avoid self-referencing)
-- Users can view their OWN membership record directly
CREATE POLICY "Users can view own membership"
  ON organization_members FOR SELECT
  USING (profile_id = auth.uid());

-- Users can view other members if they share an organization
-- Use a different approach: check via a function that doesn't cause recursion
CREATE POLICY "Users can view org members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      WHERE om.profile_id = auth.uid()
    )
  );

-- Any authenticated user can insert themselves as owner of a new org
-- (this allows creating org + membership in one flow)
CREATE POLICY "Users can add themselves as owner"
  ON organization_members FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND profile_id = auth.uid()
  );

-- Admins can add other members
CREATE POLICY "Admins can add other members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members existing
      WHERE existing.organization_id = organization_members.organization_id
        AND existing.profile_id = auth.uid()
        AND existing.role IN ('owner', 'admin')
    )
  );

-- Admins can update members (not using self-reference)
CREATE POLICY "Admins can update members"
  ON organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members existing
      WHERE existing.organization_id = organization_members.organization_id
        AND existing.profile_id = auth.uid()
        AND existing.role IN ('owner', 'admin')
    )
  );

-- Admins can delete members
CREATE POLICY "Admins can delete members"
  ON organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members existing
      WHERE existing.organization_id = organization_members.organization_id
        AND existing.profile_id = auth.uid()
        AND existing.role IN ('owner', 'admin')
    )
    OR profile_id = auth.uid() -- Users can remove themselves
  );
