-- Menu items for storefront businesses
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'General',
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storefront hours
CREATE TABLE store_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TEXT,
  close_time TEXT,
  closed BOOLEAN DEFAULT FALSE,
  UNIQUE (brand_id, day_of_week)
);

-- Storefront-specific brand fields
ALTER TABLE brands ADD COLUMN IF NOT EXISTS store_address TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS store_phone TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS store_video_url TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS store_header_font TEXT DEFAULT 'Inter';

-- RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view menu items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage their menu items" ON menu_items FOR ALL USING (
  brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
);

CREATE POLICY "Anyone can view store hours" ON store_hours FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage their store hours" ON store_hours FOR ALL USING (
  brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
);
