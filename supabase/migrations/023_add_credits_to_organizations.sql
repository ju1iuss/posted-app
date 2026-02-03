-- Add credits to organizations table
ALTER TABLE organizations 
ADD COLUMN credits INTEGER NOT NULL DEFAULT 500;

-- Add check constraint to ensure credits don't go below zero
ALTER TABLE organizations
ADD CONSTRAINT organizations_credits_check CHECK (credits >= 0);

-- Enable realtime for organizations table
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
