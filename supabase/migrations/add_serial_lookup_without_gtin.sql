-- Serialized batches for products without a GTIN.
-- Those batch QRs encode /s/:qrShortId/:serial, so the scan page resolves the
-- product from the QR code and looks up / claims the serial by product_id
-- instead of GTIN. Serials are unique per product (idx_serials_product_serial).

CREATE OR REPLACE FUNCTION lookup_serial_for_product(p_product_id UUID, p_serial_value TEXT)
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
  WHERE s.product_id = p_product_id
    AND s.serial = p_serial_value
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION claim_serial_for_product(
  p_serial_value TEXT,
  p_product_id UUID,
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
  WHERE serials.product_id = p_product_id
    AND serials.serial = p_serial_value
    AND serials.status = 'unclaimed';

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION lookup_serial_for_product(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_serial_for_product(UUID, TEXT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION claim_serial_for_product(TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_serial_for_product(TEXT, UUID, UUID) TO anon, authenticated;
