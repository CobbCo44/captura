-- Menu image/PDF upload URL on the brands table
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS menu_image_url TEXT;
