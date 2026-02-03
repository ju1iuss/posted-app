-- Add is_fixed column to template_layers
alter table template_layers 
add column if not exists is_fixed boolean default false;
