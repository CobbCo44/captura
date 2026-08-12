-- ============================================================
-- Digital Product Passport (DPP) Schema
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================

-- ------------------------------------------------
-- TABLE 1: dpp_products
--
-- Each row represents one product that has a passport.
-- Links a GTIN to a brand. A product can exist in your
-- system without a passport — this table is only for
-- products that have passport data attached.
-- ------------------------------------------------
CREATE TABLE dpp_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gtin TEXT UNIQUE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on gtin for fast lookups from the resolver
CREATE INDEX idx_dpp_products_gtin ON dpp_products(gtin);

-- Auto-update the updated_at timestamp whenever a row changes
CREATE OR REPLACE FUNCTION update_dpp_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dpp_products_updated_at
  BEFORE UPDATE ON dpp_products
  FOR EACH ROW
  EXECUTE FUNCTION update_dpp_products_updated_at();


-- ------------------------------------------------
-- TABLE 2: dpp_attributes
--
-- Flexible key-value store for passport data.
-- Each attribute (like "material_composition" or
-- "country_of_origin") is its own row.
--
-- VERSIONING RULE: This table is append-only.
-- When a brand updates an attribute, we INSERT a
-- new row with version = old version + 1, and set
-- is_current = false on the old row. We never
-- UPDATE or DELETE attribute values. The full
-- history stays forever.
-- ------------------------------------------------
CREATE TABLE dpp_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES dpp_products(id) ON DELETE CASCADE NOT NULL,
  attribute_key TEXT NOT NULL,
  attribute_value JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup: "give me all current attributes for this product"
CREATE INDEX idx_dpp_attributes_current
  ON dpp_attributes(product_id, is_current)
  WHERE is_current = true;

-- Fast lookup: "give me the history of one attribute"
CREATE INDEX idx_dpp_attributes_key
  ON dpp_attributes(product_id, attribute_key, version);


-- ------------------------------------------------
-- ROW LEVEL SECURITY
--
-- Same pattern as your existing tables:
--   - Brand owners can manage their own passport data
--   - Anyone can read passport data (passports are public)
-- ------------------------------------------------

-- dpp_products
ALTER TABLE dpp_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dpp_products" ON dpp_products
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can read dpp_products" ON dpp_products
  FOR SELECT USING (true);

-- dpp_attributes
ALTER TABLE dpp_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dpp_attributes" ON dpp_attributes
  FOR ALL USING (
    product_id IN (
      SELECT dp.id FROM dpp_products dp
      JOIN brands b ON b.id = dp.brand_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read dpp_attributes" ON dpp_attributes
  FOR SELECT USING (true);


-- ------------------------------------------------
-- SEED DATA
--
-- One example product: a t-shirt with realistic
-- apparel attributes so you can see it working.
-- Uses the GTIN from your existing Team44 product.
-- ------------------------------------------------

-- Get the brand_id for the first brand in the system
DO $$
DECLARE
  v_brand_id UUID;
  v_product_id UUID;
BEGIN
  -- Grab the first brand
  SELECT id INTO v_brand_id FROM brands LIMIT 1;

  -- Create the DPP product record
  INSERT INTO dpp_products (gtin, brand_id, product_name)
  VALUES ('00812345678906', v_brand_id, 'Team44 Pennant Race Royal Mens T-Shirt')
  RETURNING id INTO v_product_id;

  -- Insert passport attributes
  -- Each one is a separate row with its own key

  -- Material composition (what it's made of)
  INSERT INTO dpp_attributes (product_id, attribute_key, attribute_value)
  VALUES (v_product_id, 'material_composition', '"60% organic cotton, 40% recycled polyester"');

  -- Country of origin (where it was made)
  INSERT INTO dpp_attributes (product_id, attribute_key, attribute_value)
  VALUES (v_product_id, 'country_of_origin', '"Portugal"');

  -- Recyclability info
  INSERT INTO dpp_attributes (product_id, attribute_key, attribute_value)
  VALUES (v_product_id, 'recyclability', '{"recyclable": true, "instructions": "Remove labels before recycling. Textile recycling bin."}');

  -- Care instructions
  INSERT INTO dpp_attributes (product_id, attribute_key, attribute_value)
  VALUES (v_product_id, 'care_instructions', '["Machine wash cold", "Do not bleach", "Tumble dry low", "Iron low heat"]');

  -- Substances of concern (SCIP-compliant declaration)
  INSERT INTO dpp_attributes (product_id, attribute_key, attribute_value)
  VALUES (v_product_id, 'substances_of_concern', '{"contains_svhc": false, "declaration": "No REACH SVHC substances above 0.1% w/w"}');

  -- Weight
  INSERT INTO dpp_attributes (product_id, attribute_key, attribute_value)
  VALUES (v_product_id, 'weight_grams', '220');

END $$;
