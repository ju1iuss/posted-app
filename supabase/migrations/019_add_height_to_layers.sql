-- Add height column to template_layers
ALTER TABLE public.template_layers ADD COLUMN IF NOT EXISTS height float;

-- Set height equal to width for existing layers (most were 1:1)
UPDATE public.template_layers SET height = width WHERE height IS NULL;

-- Make it not null and set default
ALTER TABLE public.template_layers ALTER COLUMN height SET NOT NULL;
ALTER TABLE public.template_layers ALTER COLUMN height SET DEFAULT 80;
