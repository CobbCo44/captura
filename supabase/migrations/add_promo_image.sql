-- Add image_url column to promos table for background images
ALTER TABLE promos ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to events table for background images
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
