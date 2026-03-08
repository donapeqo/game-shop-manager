-- Migration: Add canvas background image support
-- Created: 2026-02-14

-- Create canvas settings table for global canvas configuration
CREATE TABLE IF NOT EXISTS public.canvas_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  background_image TEXT,
  canvas_width INTEGER DEFAULT 1200,
  canvas_height INTEGER DEFAULT 800,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO public.canvas_settings (id, background_image, canvas_width, canvas_height)
SELECT 
  gen_random_uuid(),
  NULL,
  1200,
  800
WHERE NOT EXISTS (SELECT 1 FROM public.canvas_settings);

-- Add RLS policy for canvas_settings
ALTER TABLE public.canvas_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON public.canvas_settings
  FOR ALL USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE public.canvas_settings IS 'Global canvas configuration including background image';
COMMENT ON COLUMN public.canvas_settings.background_image IS 'Base64 encoded background image for the canvas';
