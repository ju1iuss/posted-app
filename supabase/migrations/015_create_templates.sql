-- Create templates table
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  prompt_template text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add template_id to accounts
alter table accounts 
add column if not exists template_id uuid references templates(id) on delete set null;

-- Enable RLS on templates
alter table templates enable row level security;

-- Templates are public for now or readable by authenticated users
create policy "Templates are readable by authenticated users"
  on templates for select
  to authenticated
  using (true);

-- Seed some premade templates
insert into templates (name, description, prompt_template) values
('Daily Motivation', 'Focuses on inspiring and uplifting daily quotes and videos.', 'Generate a 15-30 second motivational video script about {topic}. The tone should be inspiring and energetic.'),
('Fashion Lookbook', 'Ideal for showcasing outfits, style tips, and trends.', 'Create a fashion lookbook for {season}. Focus on {style_niche} and include 3-5 outfit transitions.'),
('Tech Review', 'Perfect for gadget reviews and software tutorials.', 'Write a concise tech review for {product}. Highlight the top 3 features and one major drawback.'),
('Travel Guide', 'Great for city guides, hidden gems, and travel hacks.', 'Generate a travel guide for {city}. Include top 3 must-visit spots and a local food recommendation.');
