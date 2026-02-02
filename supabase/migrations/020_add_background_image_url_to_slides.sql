-- Add background_image_url to template_slides
ALTER TABLE public.template_slides ADD COLUMN IF NOT EXISTS background_image_url text;
