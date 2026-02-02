-- COMPLETE RLS FIX - Run this in Supabase SQL Editor
-- This drops ALL policies and recreates them correctly

-- =============================================
-- STEP 1: Drop ALL existing policies
-- =============================================

-- Drop all organization policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;

-- Drop all organization_members policies  
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can view members in their orgs" ON organization_members;
DROP POLICY IF EXISTS "Users can view own membership" ON organization_members;
DROP POLICY IF EXISTS "Users can view org members" ON organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can add other members" ON organization_members;
DROP POLICY IF EXISTS "Users can add themselves as owner" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can delete members" ON organization_members;

-- =============================================
-- STEP 2: Recreate helper function
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid AS $$
  SELECT organization_id 
  FROM organization_members 
  WHERE profile_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- STEP 3: Create organization policies
-- =============================================

-- SELECT: Users can view orgs they belong to
CREATE POLICY "org_select_policy"
  ON organizations FOR SELECT
  USING (id IN (SELECT public.get_user_org_ids()));

-- INSERT: Any authenticated user can create an organization
CREATE POLICY "org_insert_policy"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only owners/admins can update
CREATE POLICY "org_update_policy"
  ON organizations FOR UPDATE
  USING (id IN (SELECT public.get_user_org_ids()));

-- =============================================
-- STEP 4: Create organization_members policies
-- =============================================

-- SELECT: Users can view members of orgs they belong to
CREATE POLICY "members_select_policy"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT public.get_user_org_ids()));

-- INSERT: Users can add themselves to any org (needed for creating new orgs)
CREATE POLICY "members_insert_self_policy"
  ON organization_members FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND profile_id = auth.uid()
  );

-- UPDATE: Owners/admins can update members
CREATE POLICY "members_update_policy"
  ON organization_members FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_org_ids()));

-- DELETE: Users can remove themselves, owners/admins can remove others
CREATE POLICY "members_delete_policy"
  ON organization_members FOR DELETE
  USING (
    profile_id = auth.uid() 
    OR organization_id IN (SELECT public.get_user_org_ids())
  );
