-- Seed high-quality premade templates with Unsplash images

-- Clear existing premade data to avoid duplicates if re-applied
delete from templates where is_premade = true;

-- 1. Create image records for all Unsplash URLs (public images)
-- Use INSERT ... ON CONFLICT to handle existing images gracefully
insert into images (organization_id, storage_path, url, source, width, height)
select 
  null as organization_id,
  'templates/' || gen_random_uuid()::text as storage_path,
  url,
  'upload' as source,
  1080 as width,
  1920 as height
from unnest(array[
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1080&q=80',
  'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1080&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1080&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1080&q=80',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1080&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1080&q=80',
  'https://images.unsplash.com/photo-1539109136881-3be0610cac48?w=1080&q=80',
  'https://images.unsplash.com/photo-1501127122-f385ca6ddd9d?w=1080&q=80',
  'https://images.unsplash.com/photo-1529139513402-f20a92d1aa19?w=1080&q=80',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1080&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1080&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1080&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080&q=80',
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1080&q=80',
  'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1080&q=80'
]) as url
where url not in (select url from images where organization_id is null);

-- 2. Create the templates
with new_templates as (
  insert into templates (name, description, type, aspect_ratio, width, height, is_premade, prompt) values
  ('Aesthetic Daily Motivation', 'Beautiful minimalist motivational quotes with high-quality vibes.', 'carousel', '9:16', 1080, 1920, true, 'Generate a list of 8 short minimalist motivational quotes about discipline and self-growth.'),
  ('Urban Fashion Showcase', 'Gritty and stylish urban fashion transition template.', 'carousel', '9:16', 1080, 1920, true, 'Generate 6 fashion-forward captions for an urban lookbook.'),
  ('Product Review Pro', 'Clean and professional tech review layout.', 'carousel', '9:16', 1080, 1920, true, 'Generate a concise review structure for a tech product including pros, cons and verdict.'),
  ('Nature Travel Guide', 'Breathtaking nature destination showcase.', 'carousel', '9:16', 1080, 1920, true, 'Generate travel highlights for a hidden nature spot including best time to visit and top activity.')
  returning id, name
)
-- 3. Add slides for each template with different background images
, slides_data as (
  -- Motivation Slides
  select nt.id as template_id, pos as position, 'image' as background_type, 
    (select id from images where url = case pos
      when 0 then 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1080&q=80'
      when 1 then 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1080&q=80'
      when 2 then 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=80'
      when 3 then 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&q=80'
      when 4 then 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&q=80'
      when 5 then 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080&q=80'
      when 6 then 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1080&q=80'
      else 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1080&q=80'
    end and organization_id is null limit 1) as background_image_id
  from new_templates nt, generate_series(0, 7) as pos
  where nt.name = 'Aesthetic Daily Motivation'
  
  union all
  
  -- Fashion Slides
  select nt.id as template_id, pos as position, 'image' as background_type,
    (select id from images where url = case pos
      when 0 then 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1080&q=80'
      when 1 then 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1080&q=80'
      when 2 then 'https://images.unsplash.com/photo-1539109136881-3be0610cac48?w=1080&q=80'
      when 3 then 'https://images.unsplash.com/photo-1501127122-f385ca6ddd9d?w=1080&q=80'
      when 4 then 'https://images.unsplash.com/photo-1529139513402-f20a92d1aa19?w=1080&q=80'
      else 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1080&q=80'
    end and organization_id is null limit 1) as background_image_id
  from new_templates nt, generate_series(0, 5) as pos
  where nt.name = 'Urban Fashion Showcase'
  
  union all
  
  -- Product Review Slides
  select nt.id as template_id, pos as position, 'image' as background_type,
    (select id from images where url = case pos
      when 0 then 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080&q=80'
      when 1 then 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1080&q=80'
      when 2 then 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1080&q=80'
      when 3 then 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080&q=80'
      when 4 then 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1080&q=80'
      else 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1080&q=80'
    end and organization_id is null limit 1) as background_image_id
  from new_templates nt, generate_series(0, 5) as pos
  where nt.name = 'Product Review Pro'
)
insert into template_slides (template_id, position, background_type, background_image_id)
select template_id, position, background_type, background_image_id
from slides_data
returning id, template_id, position;

-- 3. Add default text layers for all slides
insert into template_layers (slide_id, type, position, x, y, width, text_content, font_family, font_size, font_weight, text_color, text_align)
select id, 'text', 0, 50, 50, 80, 
  case 
    when position = 0 then 'HOOK GOES HERE'
    when position = 1 then 'VALUABLE INSIGHT'
    else 'LEARN MORE'
  end, 
  'TikTok Sans', 64, 'bold', '#ffffff', 'center'
from template_slides
where template_id in (select id from templates where is_premade = true);
