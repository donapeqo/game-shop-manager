-- Migration: Add canvas positioning fields to pods table
-- Created: 2026-02-14

-- Add canvas positioning fields to pods table
ALTER TABLE public.pods 
ADD COLUMN IF NOT EXISTS canvas_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS canvas_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS canvas_width INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS canvas_height INTEGER DEFAULT 150;

-- Remove unique constraint on row/col (no longer needed for canvas view)
-- Note: Keep row/col for backward compatibility with existing grid view
ALTER TABLE public.pods DROP CONSTRAINT IF EXISTS pods_row_col_key;

-- Add index for canvas position queries
CREATE INDEX IF NOT EXISTS idx_pods_canvas ON public.pods(canvas_x, canvas_y);

-- Add comment to document the new fields
COMMENT ON COLUMN public.pods.canvas_x IS 'X position on canvas (pixels)';
COMMENT ON COLUMN public.pods.canvas_y IS 'Y position on canvas (pixels)';
COMMENT ON COLUMN public.pods.canvas_width IS 'Width of pod card on canvas (pixels)';
COMMENT ON COLUMN public.pods.canvas_height IS 'Height of pod card on canvas (pixels)';
