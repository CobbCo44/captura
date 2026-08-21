-- Remove auto-redeem from award_loyalty_point.
-- Instead, return previous_balance so the frontend can detect threshold crossings.
-- Redemption now happens ONLY via explicit redeem_loyalty_reward call.

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
  prev_balance INTEGER;
  existing_serial_claim UUID;
BEGIN
  -- Get balance before any changes
  SELECT COALESCE(SUM(points), 0) INTO prev_balance
  FROM loyalty_points WHERE contact_id = p_contact_id AND brand_id = p_brand_id;

  -- Serial-based enforcement: one claim per serial, period
  IF p_serial_id IS NOT NULL THEN
    SELECT id INTO existing_serial_claim
    FROM loyalty_points
    WHERE serial_id = p_serial_id AND type = 'earned'
    LIMIT 1;

    IF existing_serial_claim IS NOT NULL THEN
      RETURN jsonb_build_object(
        'awarded', false,
        'balance', prev_balance,
        'previous_balance', prev_balance,
        'cooldown_remaining_minutes', 0,
        'serial_claimed', true
      );
    END IF;

    -- Award the point with serial_id
    INSERT INTO loyalty_points (contact_id, brand_id, product_id, serial_id, points, type)
    VALUES (p_contact_id, p_brand_id, p_product_id, p_serial_id, 1, 'earned');

    SELECT COALESCE(SUM(points), 0) INTO new_balance
    FROM loyalty_points WHERE contact_id = p_contact_id AND brand_id = p_brand_id;

    RETURN jsonb_build_object(
      'awarded', true,
      'balance', new_balance,
      'previous_balance', prev_balance,
      'cooldown_remaining_minutes', 0,
      'serial_claimed', false
    );
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
      RETURN jsonb_build_object(
        'awarded', false,
        'balance', prev_balance,
        'previous_balance', prev_balance,
        'cooldown_remaining_minutes', cooldown_remaining
      );
    END IF;
  END IF;

  -- Award the point
  INSERT INTO loyalty_points (contact_id, brand_id, product_id, points, type)
  VALUES (p_contact_id, p_brand_id, p_product_id, 1, 'earned');

  SELECT COALESCE(SUM(points), 0) INTO new_balance
  FROM loyalty_points WHERE contact_id = p_contact_id AND brand_id = p_brand_id;

  RETURN jsonb_build_object(
    'awarded', true,
    'balance', new_balance,
    'previous_balance', prev_balance,
    'cooldown_remaining_minutes', 0
  );
END;
$$;

-- Add reward_email_sent table for deduplication (Task 3)
CREATE TABLE IF NOT EXISTS reward_emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE CASCADE NOT NULL,
  balance_at_send INTEGER NOT NULL,
  consent_checked BOOLEAN NOT NULL DEFAULT true,
  consent_had BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_reward_emails_dedup
  ON reward_emails_sent (contact_id, brand_id, reward_id)
  WHERE error IS NULL;

ALTER TABLE reward_emails_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners read own reward emails" ON reward_emails_sent
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Allow service role full access (Netlify function uses service role key)
-- No anon/authenticated INSERT policy needed since the function uses service role

-- Consent changes audit table — preserves original opt-in evidence
-- when consent is revoked (e.g. email unsubscribe)
CREATE TABLE IF NOT EXISTS consent_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_source TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_changes_contact
  ON consent_changes (contact_id, brand_id, changed_at);

ALTER TABLE consent_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners read own consent changes" ON consent_changes
  FOR SELECT USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));
