-- Custom kit colors (used when kit = 'custom')
ALTER TABLE brands ADD COLUMN IF NOT EXISTS kit_bg TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS kit_card TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS kit_border TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS kit_bg_image TEXT;
