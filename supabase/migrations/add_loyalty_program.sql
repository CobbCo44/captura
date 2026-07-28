-- =============================================
-- CAPTURA: Loyalty Program
-- =============================================

-- 1. Add loyalty columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS loyalty_cooldown_hours INTEGER DEFAULT 24;

-- 2. Loyalty rewards — configured per brand
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('discount_code', 'free_product', 'custom')),
  reward_value TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_rewards_brand ON loyalty_rewards (brand_id);

ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners manage own rewards" ON loyalty_rewards
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can read active rewards" ON loyalty_rewards
  FOR SELECT USING (active = true);

-- 3. Loyalty points ledger
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed')),
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_points_contact_brand ON loyalty_points (contact_id, brand_id);
CREATE INDEX idx_loyalty_points_dedup ON loyalty_points (contact_id, product_id, created_at);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners read own loyalty points" ON loyalty_points
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- 4. Update contacts source constraint to include 'loyalty'
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_source_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_source_check
  CHECK (source IN ('promo', 'warranty', 'vip', 'event', 'serial', 'loyalty'));

-- 5. Award loyalty point — server-side anti-fraud
CREATE OR REPLACE FUNCTION award_loyalty_point(
  p_brand_id UUID,
  p_contact_id UUID,
  p_product_id UUID,
  p_cooldown_hours INTEGER DEFAULT 24
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
BEGIN
  -- Check for recent earn on this product by this contact
  SELECT MAX(created_at) INTO last_earn
  FROM loyalty_points
  WHERE contact_id = p_contact_id
    AND product_id = p_product_id
    AND type = 'earned';

  IF last_earn IS NOT NULL AND last_earn > NOW() - (p_cooldown_hours || ' hours')::INTERVAL THEN
    -- Still in cooldown
    cooldown_remaining := EXTRACT(EPOCH FROM (last_earn + (p_cooldown_hours || ' hours')::INTERVAL - NOW())) / 60;
    SELECT COALESCE(SUM(points), 0) INTO new_balance
    FROM loyalty_points WHERE contact_id = p_contact_id AND brand_id = p_brand_id;
    RETURN jsonb_build_object('awarded', false, 'balance', new_balance, 'cooldown_remaining_minutes', cooldown_remaining);
  END IF;

  -- Award the point
  INSERT INTO loyalty_points (contact_id, brand_id, product_id, points, type)
  VALUES (p_contact_id, p_brand_id, p_product_id, 1, 'earned');

  SELECT COALESCE(SUM(points), 0) INTO new_balance
  FROM loyalty_points WHERE contact_id = p_contact_id AND brand_id = p_brand_id;

  RETURN jsonb_build_object('awarded', true, 'balance', new_balance, 'cooldown_remaining_minutes', 0);
END;
$$;

-- 6. Redeem loyalty reward
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_contact_id UUID,
  p_brand_id UUID,
  p_reward_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_required INTEGER;
  v_reward_value TEXT;
  v_reward_name TEXT;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get reward details
  SELECT points_required, reward_value, name INTO v_points_required, v_reward_value, v_reward_name
  FROM loyalty_rewards
  WHERE id = p_reward_id AND brand_id = p_brand_id AND active = true;

  IF v_points_required IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward not found');
  END IF;

  -- Check balance
  SELECT COALESCE(SUM(points), 0) INTO v_balance
  FROM loyalty_points WHERE contact_id = p_contact_id AND brand_id = p_brand_id;

  IF v_balance < v_points_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough points', 'balance', v_balance);
  END IF;

  -- Deduct points
  INSERT INTO loyalty_points (contact_id, brand_id, points, type, reward_id)
  VALUES (p_contact_id, p_brand_id, -v_points_required, 'redeemed', p_reward_id);

  v_new_balance := v_balance - v_points_required;

  RETURN jsonb_build_object('success', true, 'reward_name', v_reward_name, 'reward_value', v_reward_value, 'new_balance', v_new_balance);
END;
$$;

-- 7. Get loyalty balance
CREATE OR REPLACE FUNCTION get_loyalty_balance(
  p_contact_id UUID,
  p_brand_id UUID
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'balance', COALESCE(SUM(points), 0),
    'total_earned', COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0),
    'total_redeemed', COALESCE(SUM(CASE WHEN type = 'redeemed' THEN ABS(points) ELSE 0 END), 0)
  )
  FROM loyalty_points
  WHERE contact_id = p_contact_id AND brand_id = p_brand_id;
$$;

-- Grant execute to anon + authenticated
REVOKE EXECUTE ON FUNCTION award_loyalty_point(UUID, UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION award_loyalty_point(UUID, UUID, UUID, INTEGER) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION redeem_loyalty_reward(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_loyalty_reward(UUID, UUID, UUID) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION get_loyalty_balance(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_loyalty_balance(UUID, UUID) TO anon, authenticated;
