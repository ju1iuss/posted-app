-- Template Editor Migration
-- Replaces simple templates table with comprehensive editor structure

-- Drop old templates table and recreate with new structure
drop table if exists templates cascade;

-- Create new templates table
create table templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  
  name text not null,
  description text,
  type text not null check (type in ('carousel', 'video')),
  
  -- Canvas settings
  aspect_ratio text not null default '9:16', -- '9:16', '3:4', '1:1', '16:9', '4:3'
  width int not null default 1080,
  height int not null default 1920,
  
  -- AI prompt for generating text content
  prompt text,
  
  -- For premade templates (organization_id = null)
  is_premade boolean default false,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create template_slides table
create table template_slides (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id) on delete cascade,
  position int not null default 0,
  
  -- Background image source
  background_type text check (background_type in ('none', 'color', 'image', 'collection_random', 'collection_specific')),
  background_color text, -- hex color
  background_image_id uuid references images(id) on delete set null,
  background_collection_id uuid references collections(id) on delete set null,
  
  -- For video templates: video source
  video_url text,
  video_collection_id uuid references collections(id) on delete set null, -- for hook videos
  
  created_at timestamptz default now()
);

-- Create template_layers table
create table template_layers (
  id uuid primary key default gen_random_uuid(),
  slide_id uuid not null references template_slides(id) on delete cascade,
  type text not null check (type in ('text', 'image')),
  position int not null default 0, -- z-index
  
  -- Position and size (percentage-based for responsiveness)
  x float not null default 50, -- center X (0-100)
  y float not null default 50, -- center Y (0-100)
  width float not null default 80, -- width as % of canvas
  
  -- Text layer properties
  text_content text,
  font_family text default 'TikTok Sans',
  font_size int default 48,
  font_weight text default 'bold',
  text_color text default '#ffffff',
  text_align text default 'center',
  background_color text, -- text background
  stroke_color text,
  stroke_width int default 0,
  
  -- Image layer properties
  image_id uuid references images(id) on delete set null,
  image_collection_id uuid references collections(id) on delete set null,
  image_source_type text check (image_source_type in ('specific', 'collection_random', 'upload')),
  
  created_at timestamptz default now()
);

-- Re-add template_id to accounts (in case it was dropped)
alter table accounts 
add column if not exists template_id uuid references templates(id) on delete set null;

-- Enable RLS on all tables
alter table templates enable row level security;
alter table template_slides enable row level security;
alter table template_layers enable row level security;

-- RLS Policies for templates
-- Users can view templates in their org or premade templates
create policy "Users can view templates in their org or premade"
  on templates for select
  to authenticated
  using (
    organization_id in (select public.get_user_org_ids())
    or is_premade = true
  );

-- Users can create templates in their org
create policy "Users can create templates in their org"
  on templates for insert
  to authenticated
  with check (
    organization_id in (select public.get_user_org_ids())
  );

-- Users can update templates in their org
create policy "Users can update templates in their org"
  on templates for update
  to authenticated
  using (
    organization_id in (select public.get_user_org_ids())
  );

-- Users can delete templates in their org
create policy "Users can delete templates in their org"
  on templates for delete
  to authenticated
  using (
    organization_id in (select public.get_user_org_ids())
  );

-- RLS Policies for template_slides
-- Users can view slides for templates they can access
create policy "Users can view slides for accessible templates"
  on template_slides for select
  to authenticated
  using (
    template_id in (
      select id from templates
      where organization_id in (select public.get_user_org_ids())
      or is_premade = true
    )
  );

-- Users can manage slides for templates in their org
create policy "Users can manage slides in their org"
  on template_slides for all
  to authenticated
  using (
    template_id in (
      select id from templates
      where organization_id in (select public.get_user_org_ids())
    )
  );

-- RLS Policies for template_layers
-- Users can view layers for slides they can access
create policy "Users can view layers for accessible slides"
  on template_layers for select
  to authenticated
  using (
    slide_id in (
      select ts.id from template_slides ts
      join templates t on ts.template_id = t.id
      where t.organization_id in (select public.get_user_org_ids())
      or t.is_premade = true
    )
  );

-- Users can manage layers for templates in their org
create policy "Users can manage layers in their org"
  on template_layers for all
  to authenticated
  using (
    slide_id in (
      select ts.id from template_slides ts
      join templates t on ts.template_id = t.id
      where t.organization_id in (select public.get_user_org_ids())
    )
  );

-- Indexes for performance
create index if not exists templates_organization_id_idx on templates(organization_id);
create index if not exists templates_type_idx on templates(type);
create index if not exists templates_is_premade_idx on templates(is_premade);
create index if not exists template_slides_template_id_idx on template_slides(template_id);
create index if not exists template_slides_position_idx on template_slides(template_id, position);
create index if not exists template_layers_slide_id_idx on template_layers(slide_id);
create index if not exists template_layers_position_idx on template_layers(slide_id, position);

-- Trigger for updated_at on templates
create trigger set_templates_updated_at
  before update on templates
  for each row execute procedure public.handle_updated_at();

-- Seed some premade templates (carousel examples)
insert into templates (name, description, type, aspect_ratio, width, height, is_premade, prompt) values
('Daily Motivation Carousel', '8-slide motivational carousel with quotes and images', 'carousel', '9:16', 1080, 1920, true, 'Generate motivational quotes and content for daily inspiration'),
('Fashion Lookbook', '6-slide fashion showcase with outfit transitions', 'carousel', '9:16', 1080, 1920, true, 'Create fashion lookbook content with style tips'),
('Tech Review Carousel', '8-slide tech product review format', 'carousel', '9:16', 1080, 1920, true, 'Generate tech review content highlighting features and drawbacks'),
('Travel Guide', '6-slide travel destination guide', 'carousel', '9:16', 1080, 1920, true, 'Create travel guide content with destination highlights');
