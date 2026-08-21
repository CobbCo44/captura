-- Auto-redeem loyalty rewards when consumer hits the points threshold
-- Updates award_loyalty_point to check for eligible rewards after awarding a point

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
  v_reward_id UUID;
  v_reward_name TEXT;
  v_reward_value TEXT;
  v_reward_points INTEGER;
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

    -- Check for auto-redeem
    SELECT id, name, reward_value, points_required
    INTO v_reward_id, v_reward_name, v_reward_value, v_reward_points
    FROM loyalty_rewards
    WHERE brand_id = p_brand_id AND active = true AND points_required <= new_balance
    ORDER BY points_required ASC
    LIMIT 1;

    IF v_reward_id IS NOT NULL THEN
      INSERT INTO loyalty_points (contact_id, brand_id, points, type, reward_id)
      VALUES (p_contact_id, p_brand_id, -v_reward_points, 'redeemed', v_reward_id);
      new_balance := new_balance - v_reward_points;
      RETURN jsonb_build_object(
        'awarded', true, 'balance', new_balance, 'cooldown_remaining_minutes', 0, 'serial_claimed', false,
        'auto_redeemed', true, 'reward_name', v_reward_name, 'reward_value', v_reward_value, 'reward_points', v_reward_points
      );
    END IF;

    RETURN jsonb_build_object('awarded', true, 'balance', new_balance, 'cooldown_remaining_minutes', 0, 'serial_claimed', false);
  END IF;

  -- Cooldown-based enforcement (storefronts and non-serialized products)
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

  -- Check for auto-redeem
  SELECT id, name, reward_value, points_required
  INTO v_reward_id, v_reward_name, v_reward_value, v_reward_points
  FROM loyalty_rewards
  WHERE brand_id = p_brand_id AND active = true AND points_required <= new_balance
  ORDER BY points_required ASC
  LIMIT 1;

  IF v_reward_id IS NOT NULL THEN
    INSERT INTO loyalty_points (contact_id, brand_id, points, type, reward_id)
    VALUES (p_contact_id, p_brand_id, -v_reward_points, 'redeemed', v_reward_id);
    new_balance := new_balance - v_reward_points;
    RETURN jsonb_build_object(
      'awarded', true, 'balance', new_balance, 'cooldown_remaining_minutes', 0,
      'auto_redeemed', true, 'reward_name', v_reward_name, 'reward_value', v_reward_value, 'reward_points', v_reward_points
    );
  END IF;

  RETURN jsonb_build_object('awarded', true, 'balance', new_balance, 'cooldown_remaining_minutes', 0);
END;
$$;
