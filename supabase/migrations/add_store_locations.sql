-- Store locations for multi-location storefronts
CREATE TABLE store_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store locations" ON store_locations FOR SELECT USING (true);
CREATE POLICY "Authenticated users manage their store locations" ON store_locations FOR ALL USING (
  brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
);
