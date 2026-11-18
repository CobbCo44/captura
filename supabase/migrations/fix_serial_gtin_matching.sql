-- Serialized labels carry the 14-digit GTIN (e.g. 00850012345678) but products
-- are often saved with the 12-digit UPC (850012345678). Compare both sides in
-- normalized 14-digit form so the label finds its serial.

CREATE OR REPLACE FUNCTION normalize_gtin(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT lpad(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 14, '0')
$$;

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
    s.id, s.status, p.id, p.name, p.gtin, b.brand_id, s.batch_id, b.channel_id, ch.name
  FROM serials s
  JOIN batches b  ON b.id = s.batch_id
  JOIN products p ON p.id = s.product_id
  JOIN channels ch ON ch.id = b.channel_id
  WHERE normalize_gtin(p.gtin) = normalize_gtin(p_gtin)
    AND s.serial = p_serial_value
  LIMIT 1;
$$;

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
    AND normalize_gtin(p.gtin) = normalize_gtin(p_gtin)
    AND serials.serial = p_serial_value
    AND serials.status = 'unclaimed';

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION lookup_serial(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_serial(TEXT, TEXT) TO anon, authenticated;
