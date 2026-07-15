CREATE OR REPLACE FUNCTION generate_serial_code()
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT string_agg(
    substr(
      'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ',
      (get_byte(gen_random_bytes(1), 0) % 53) + 1,
      1
    ),
    ''
  )
  FROM generate_series(1, 10);
$$;

CREATE OR REPLACE FUNCTION generate_batch(
  p_product_id UUID,
  p_channel_id UUID,
  p_quantity INTEGER,
  p_po_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
  v_batch_id UUID;
  v_user_id UUID;
  v_channel_brand UUID;
  v_chunk_size INTEGER := 1000;
  v_offset INTEGER := 0;
  v_chunk INTEGER;
BEGIN
  SELECT auth.uid() INTO v_user_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.brand_id INTO v_brand_id
  FROM products p
  JOIN brands b ON b.id = p.brand_id
  WHERE p.id = p_product_id
    AND b.user_id = v_user_id;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Product not found or not owned by you';
  END IF;

  SELECT brand_id INTO v_channel_brand
  FROM channels WHERE id = p_channel_id;

  IF v_channel_brand IS NULL OR v_channel_brand != v_brand_id THEN
    RAISE EXCEPTION 'Channel not found or belongs to a different brand';
  END IF;

  IF p_quantity < 1 OR p_quantity > 10000 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 10,000';
  END IF;

  INSERT INTO batches (brand_id, product_id, channel_id, po_reference, quantity, notes)
  VALUES (v_brand_id, p_product_id, p_channel_id, p_po_reference, p_quantity, p_notes)
  RETURNING id INTO v_batch_id;

  WHILE v_offset < p_quantity LOOP
    v_chunk := LEAST(p_quantity - v_offset, v_chunk_size);

    INSERT INTO serials (batch_id, product_id, serial)
    SELECT v_batch_id, p_product_id, generate_serial_code()
    FROM generate_series(1, v_chunk);

    v_offset := v_offset + v_chunk;
  END LOOP;

  RETURN v_batch_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_batch(UUID, UUID, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_batch(UUID, UUID, INTEGER, TEXT, TEXT) TO authenticated;
