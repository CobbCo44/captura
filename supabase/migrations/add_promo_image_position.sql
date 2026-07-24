-- Add image_position column to promos for background focal point
ALTER TABLE promos ADD COLUMN IF NOT EXISTS image_position text DEFAULT 'center';
