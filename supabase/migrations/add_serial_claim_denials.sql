-- Track denied serial loyalty claims for anti-counterfeit insights
CREATE TABLE IF NOT EXISTS serial_claim_denials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_id UUID REFERENCES serials(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  device TEXT,
  user_agent TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_serial_claim_denials_serial ON serial_claim_denials (serial_id);
CREATE INDEX idx_serial_claim_denials_brand ON serial_claim_denials (brand_id);

ALTER TABLE serial_claim_denials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners read own denials" ON serial_claim_denials
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can insert denials" ON serial_claim_denials
  FOR INSERT WITH CHECK (true);
