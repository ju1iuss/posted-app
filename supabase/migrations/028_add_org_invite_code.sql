-- Add invite_code to organizations
alter table organizations add column if not exists invite_code text unique default encode(gen_random_bytes(6), 'hex');

-- Function to regenerate invite code
create or replace function regenerate_org_invite_code(org_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  new_code text;
begin
  new_code := encode(gen_random_bytes(6), 'hex');
  update organizations set invite_code = new_code where id = org_id;
  return new_code;
end;
$$;
