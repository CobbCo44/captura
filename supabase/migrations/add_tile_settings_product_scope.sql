-- Per-product tile settings for product brands.
-- product_id NULL = the brand-wide arrangement (and all storefront rows).
-- A product with its own rows overrides the brand-wide set completely.
ALTER TABLE tile_settings
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE tile_settings DROP CONSTRAINT IF EXISTS tile_settings_brand_id_tile_key_context_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tile_settings_unique
  ON tile_settings (brand_id, tile_key, context, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Replace the save function with a product-scoped version.
-- Old 3-arg signature must go so calls stay unambiguous.
DROP FUNCTION IF EXISTS save_tile_settings(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION save_tile_settings(p_brand_id UUID, p_context TEXT, p_settings JSONB, p_product_id UUID DEFAULT NULL)
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
  IF p_product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM products WHERE id = p_product_id AND brand_id = p_brand_id
  ) THEN
    RAISE EXCEPTION 'That product does not belong to this brand.';
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

  DELETE FROM tile_settings
   WHERE brand_id = p_brand_id AND context = p_context
     AND product_id IS NOT DISTINCT FROM p_product_id;
  FOR item IN SELECT * FROM jsonb_array_elements(p_settings) LOOP
    INSERT INTO tile_settings (brand_id, tile_key, context, enabled, sort, product_id)
    VALUES (p_brand_id, item->>'tile_key', p_context, (item->>'enabled')::boolean, i, p_product_id);
    i := i + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
