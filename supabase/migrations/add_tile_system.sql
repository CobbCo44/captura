-- Tile system: owner-defined custom tiles + per-context ordering/toggles
-- for scan page tiles (storefront counter/label QRs and product scans).

-- 1. Custom tiles (max 3 active per brand, enforced by trigger below)
CREATE TABLE IF NOT EXISTS custom_tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 30),
  url TEXT NOT NULL CHECK (url ~* '^https?://[^\s]+$'),
  description TEXT CHECK (char_length(description) <= 80),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_tiles_brand ON custom_tiles (brand_id, is_active, sort);

ALTER TABLE custom_tiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own custom tiles" ON custom_tiles
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Scan pages are anonymous; they only ever need active tiles
CREATE POLICY "Anyone reads active custom tiles" ON custom_tiles
  FOR SELECT USING (is_active = true);

-- Enforce max 3 active custom tiles per brand, server-side
CREATE OR REPLACE FUNCTION enforce_custom_tile_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    IF (SELECT COUNT(*) FROM custom_tiles
        WHERE brand_id = NEW.brand_id AND is_active = true AND id <> NEW.id) >= 3 THEN
      RAISE EXCEPTION 'You can have at most 3 active custom tiles. Deactivate one first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_tile_limit ON custom_tiles;
CREATE TRIGGER trg_custom_tile_limit
  BEFORE INSERT OR UPDATE ON custom_tiles
  FOR EACH ROW EXECUTE FUNCTION enforce_custom_tile_limit();

-- 2. Per-context tile ordering and visibility.
-- context: 'counter' | 'label' (storefront QRs), 'product' (product scans).
-- tile_key: native keys ('promo','video','winner','loyalty','menu','hours',
-- 'locations','follow','reorder','warranty') or 'custom:<uuid>'.
-- No rows for a (brand, context) = current default layout, all tiles on.
CREATE TABLE IF NOT EXISTS tile_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  tile_key TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('counter', 'label', 'product')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE (brand_id, tile_key, context)
);

CREATE INDEX IF NOT EXISTS idx_tile_settings_brand_ctx ON tile_settings (brand_id, context, sort);

ALTER TABLE tile_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own tile settings" ON tile_settings
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Anyone reads tile settings" ON tile_settings
  FOR SELECT USING (true);

-- 3. Atomic save with the pinning rule enforced server-side.
-- p_settings: jsonb array of {tile_key, enabled} in display order.
-- Rule: on the storefront Counter QR, an enabled loyalty tile must sit
-- within the top three enabled positions.
CREATE OR REPLACE FUNCTION save_tile_settings(p_brand_id UUID, p_context TEXT, p_settings JSONB)
RETURNS void AS $$
DECLARE
  loyalty_pos INTEGER := NULL;
  enabled_idx INTEGER := 0;
  item JSONB;
  i INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM brands WHERE id = p_brand_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not your brand.';
  END IF;
  IF p_context NOT IN ('counter', 'label', 'product') THEN
    RAISE EXCEPTION 'Unknown context %', p_context;
  END IF;

  IF p_context = 'counter' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(p_settings) LOOP
      IF (item->>'enabled')::boolean THEN
        enabled_idx := enabled_idx + 1;
        IF item->>'tile_key' = 'loyalty' THEN
          loyalty_pos := enabled_idx;
        END IF;
      END IF;
    END LOOP;
    IF loyalty_pos IS NOT NULL AND loyalty_pos > 3 THEN
      RAISE EXCEPTION 'The Loyalty tile is pinned to the top three positions on the Counter QR. Move it up before saving.';
    END IF;
  END IF;

  DELETE FROM tile_settings WHERE brand_id = p_brand_id AND context = p_context;
  FOR item IN SELECT * FROM jsonb_array_elements(p_settings) LOOP
    INSERT INTO tile_settings (brand_id, tile_key, context, enabled, sort)
    VALUES (p_brand_id, item->>'tile_key', p_context, (item->>'enabled')::boolean, i);
    i := i + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
