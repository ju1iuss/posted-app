-- Add template_id to accounts table
alter table accounts 
add column template_id uuid references templates(id) on delete set null;

-- Add index for faster lookups
create index if not exists accounts_template_id_idx on accounts(template_id);

-- Add comment
comment on column accounts.template_id is 'Template assigned to this account for content generation';
