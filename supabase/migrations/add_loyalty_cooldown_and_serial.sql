-- 1. Add storefront loyalty cooldown (hours) to brands
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS loyalty_cooldown_hours INTEGER DEFAULT 12;

-- 2. Add serial_id to loyalty_points for one-claim-per-serial enforcement
ALTER TABLE loyalty_points
  ADD COLUMN IF NOT EXISTS serial_id UUID REFERENCES serials(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_points_serial_unique
  ON loyalty_points (serial_id) WHERE serial_id IS NOT NULL AND type = 'earned';

-- 3. Update award_loyalty_point to support serial-based dedup
CREATE OR REPLACE FUNCTION award_loyalty_point(
  p_brand_id UUID,
  p_contact_id UUID,
  p_product_id UUID,
  p_cooldown_hours INTEGER DEFAULT 24,
  p_serial_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_earn TIMESTAMPTZ;
  cooldown_remaining INTEGER;
  new_balance INTEGER;
  existing_serial_claim UUID;
BEGIN
  -- Serial-based enforcement: one claim per serial, period
  IF p_serial_id IS NOT NULL THEN
    SELECT id INTO existing_serial_claim
    FROM loyalty_points
    WHERE serial_id = p_serial_id AND type = 'earned'
    LIMIT 1;

    IF existing_serial_claim IS NOT NULL THEN
      SELECT COALESCE(SUM(points), 0) INTO new_balance
      FROM loyalty_points WHERE contact_id = p_contact_id AND brand_id = p_brand_id;
      RETURN jsonb_build_object('awarded', false, 'balance', new_balance, 'cooldown_remaining_minutes', 0, 'serial_claimed', true);
    END IF;

    -- Award the point with serial_id
    INSERT INTO loyalty_points (contact_id, brand_id, product_id, serial_id, points, type)
    VALUES (p_contact_id, p_brand_id, p_product_id, p_serial_id, 1, 'earned');

    SELECT COALESCE(SUM(points), 0) INTO new_balance
    FROM loyalty_points WHERE contact_id = p_contact_id AND brand_id = p_brand_id;

    RETURN jsonb_build_object('awarded', true, 'balance', new_balance, 'cooldown_remaining_minutes', 0, 'serial_claimed', false);
  END IF;

  -- Cooldown-based enforcement (storefronts and non-serialized products)
  -- If cooldown is 0, skip the check (always award)
  IF p_cooldown_hours > 0 THEN
    SELECT MAX(created_at) INTO last_earn
    FROM loyalty_points
    WHERE contact_id = p_contact_id
      AND brand_id = p_brand_id
      AND (p_product_id IS NULL OR product_id = p_product_id)
      AND type = 'earned';

    IF last_earn IS NOT NULL AND last_earn > NOW() - (p_cooldown_hours || ' hours')::INTERVAL THEN
      cooldown_remaining := EXTRACT(EPOCH FROM (last_earn + (p_cooldown_hours || ' hours')::INTERVAL - NOW())) / 60;
      SELECT COALESCE(SUM(points), 0) INTO new_balance
      FROM loyalty_points WHERE contact_id = p_contact_id AND brand_id = p_brand_id;
      RETURN jsonb_build_object('awarded', false, 'balance', new_balance, 'cooldown_remaining_minutes', cooldown_remaining);
    END IF;
  END IF;

  -- Award the point
  INSERT INTO loyalty_points (contact_id, brand_id, product_id, points, type)
  VALUES (p_contact_id, p_brand_id, p_product_id, 1, 'earned');

  SELECT COALESCE(SUM(points), 0) INTO new_balance
  FROM loyalty_points WHERE contact_id = p_contact_id AND brand_id = p_brand_id;

  RETURN jsonb_build_object('awarded', true, 'balance', new_balance, 'cooldown_remaining_minutes', 0);
END;
$$;

-- Update grants for new signature
REVOKE EXECUTE ON FUNCTION award_loyalty_point(UUID, UUID, UUID, INTEGER, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION award_loyalty_point(UUID, UUID, UUID, INTEGER, UUID) TO anon, authenticated;
