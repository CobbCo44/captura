-- Multiple menu images per brand (replaces single menu_image_url on brands)
CREATE TABLE IF NOT EXISTS menu_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Menu',
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrate existing menu_image_url rows into the new table
INSERT INTO menu_images (brand_id, label, url, sort_order)
SELECT id, 'Menu', menu_image_url, 0
FROM brands
WHERE menu_image_url IS NOT NULL;

-- RLS
ALTER TABLE menu_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands can manage own menu images"
  ON menu_images FOR ALL
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Public can view menu images"
  ON menu_images FOR SELECT
  USING (true);
