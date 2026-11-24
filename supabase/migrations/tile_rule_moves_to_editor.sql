-- The "Loyalty in the top three" rule moves to the Scan Page editor, which
-- knows which tiles actually show (a tile with nothing in it is hidden from
-- customers). The database counted hidden tiles and blocked valid layouts.
CREATE OR REPLACE FUNCTION save_tile_settings(p_brand_id UUID, p_context TEXT, p_settings JSONB, p_product_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
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
