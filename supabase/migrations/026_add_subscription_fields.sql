-- Add subscription-related fields to organizations table
-- For Stripe integration with hard paywall

-- Stripe customer and subscription IDs
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Subscription status tracking
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';

-- Add check constraint for subscription_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_subscription_status_check'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_status_check 
      CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'));
  END IF;
END $$;

-- Subscription period tracking
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Seat limit (2 seats included per subscription)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_seats INTEGER DEFAULT 2;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription_id ON organizations(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);

-- Function to check seat availability before adding a member
CREATE OR REPLACE FUNCTION check_seat_availability()
RETURNS TRIGGER AS $$
DECLARE
  current_member_count INTEGER;
  org_max_seats INTEGER;
BEGIN
  -- Get current member count for the organization
  SELECT COUNT(*) INTO current_member_count
  FROM organization_members
  WHERE organization_id = NEW.organization_id;

  -- Get max seats for the organization
  SELECT COALESCE(max_seats, 2) INTO org_max_seats
  FROM organizations
  WHERE id = NEW.organization_id;

  -- Check if adding this member would exceed the limit
  IF current_member_count >= org_max_seats THEN
    RAISE EXCEPTION 'Organization has reached its seat limit of % members', org_max_seats;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce seat limits
DROP TRIGGER IF EXISTS enforce_seat_limit ON organization_members;
CREATE TRIGGER enforce_seat_limit
  BEFORE INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION check_seat_availability();
