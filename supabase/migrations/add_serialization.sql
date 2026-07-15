-- =============================================
-- CAPTURA V2: Serialization, Batches & Channel Attribution
-- =============================================

-- 1. Channels — retail destinations per brand
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('retail', 'dtc', 'distributor', 'event')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate channel names within a brand (case-insensitive)
CREATE UNIQUE INDEX idx_channels_brand_name
  ON channels (brand_id, lower(name));

CREATE INDEX idx_channels_brand ON channels (brand_id);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Brand owners only — no anon access
CREATE POLICY "Brand owners manage own channels" ON channels
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Seed a default "DTC" channel for every existing brand
INSERT INTO channels (brand_id, name, type)
SELECT id, 'DTC', 'dtc' FROM brands
ON CONFLICT DO NOTHING;

-- 2. Batches — a generation run of N serials for one product
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES channels(id) ON DELETE RESTRICT NOT NULL,
  po_reference TEXT,
  quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 10000),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_batches_brand ON batches (brand_id);
CREATE INDEX idx_batches_product ON batches (product_id);
CREATE INDEX idx_batches_channel ON batches (channel_id);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Brand owners only — no anon access
CREATE POLICY "Brand owners manage own batches" ON batches
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- 3. Serials — one row per physical unit
CREATE TABLE IF NOT EXISTS serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE NOT NULL,
  serial TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'claimed')),
  claimed_by_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup during scans: find a serial by its value
CREATE INDEX idx_serials_serial ON serials (serial);

-- Fast lookup: which serials has a contact claimed?
CREATE INDEX idx_serials_claimed_by ON serials (claimed_by_contact_id);

-- Batch membership
CREATE INDEX idx_serials_batch ON serials (batch_id);

-- Denormalized product_id for the unique constraint (populated by batch generation)
ALTER TABLE serials ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- Unique constraint: no duplicate serial for the same product (GTIN)
CREATE UNIQUE INDEX idx_serials_product_serial ON serials (product_id, serial);

ALTER TABLE serials ENABLE ROW LEVEL SECURITY;

-- Brand owners can read their own serials (dashboard). No anon access at all.
CREATE POLICY "Brand owners read own serials" ON serials
  FOR SELECT USING (batch_id IN (SELECT id FROM batches WHERE brand_id IN
    (SELECT id FROM brands WHERE user_id = auth.uid())));

-- No anon SELECT, INSERT, UPDATE, or DELETE.
-- All anonymous access goes through SECURITY DEFINER functions below.

-- 4. Extend scans table with serial_id
ALTER TABLE scans ADD COLUMN IF NOT EXISTS serial_id UUID REFERENCES serials(id);
CREATE INDEX idx_scans_serial ON scans (serial_id);

-- 5. Extend contacts source check to include 'event' and 'serial'
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_source_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_source_check
  CHECK (source IN ('promo', 'warranty', 'vip', 'event', 'serial'));


-- =============================================
-- SECURITY DEFINER FUNCTIONS — the only anonymous access path to serials
-- =============================================

-- lookup_serial: called by the scan page to resolve a /21/ segment.
-- Takes an exact GTIN + serial pair. Returns the serial row + product info
-- needed to render the page, or empty if no match. By-value lookup only —
-- there is no code path that lists or enumerates serials.
CREATE OR REPLACE FUNCTION lookup_serial(p_gtin TEXT, p_serial_value TEXT)
RETURNS TABLE (
  serial_id UUID,
  serial_status TEXT,
  product_id UUID,
  product_name TEXT,
  product_gtin TEXT,
  brand_id UUID,
  batch_id UUID,
  channel_id UUID,
  channel_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    s.id        AS serial_id,
    s.status    AS serial_status,
    p.id        AS product_id,
    p.name      AS product_name,
    p.gtin      AS product_gtin,
    b.brand_id  AS brand_id,
    s.batch_id  AS batch_id,
    b.channel_id AS channel_id,
    ch.name     AS channel_name
  FROM serials s
  JOIN batches b  ON b.id = s.batch_id
  JOIN products p ON p.id = s.product_id
  JOIN channels ch ON ch.id = b.channel_id
  WHERE p.gtin = p_gtin
    AND s.serial = p_serial_value
  LIMIT 1;
$$;

-- claim_serial: called after contact capture to claim a serial.
-- Performs the atomic conditional update: unclaimed → claimed.
-- Returns true if the claim succeeded, false if already claimed.
-- This is the ONLY way a claim can ever be written.
CREATE OR REPLACE FUNCTION claim_serial(
  p_serial_value TEXT,
  p_gtin TEXT,
  p_contact_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE serials
  SET status = 'claimed',
      claimed_by_contact_id = p_contact_id,
      claimed_at = NOW()
  FROM products p
  JOIN batches b ON b.product_id = p.id
  WHERE serials.batch_id = b.id
    AND serials.product_id = p.id
    AND p.gtin = p_gtin
    AND serials.serial = p_serial_value
    AND serials.status = 'unclaimed';

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

-- Lock down EXECUTE: revoke default public grant, allow only anon + authenticated
REVOKE EXECUTE ON FUNCTION lookup_serial(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_serial(TEXT, TEXT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION claim_serial(TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_serial(TEXT, TEXT, UUID) TO anon, authenticated;
