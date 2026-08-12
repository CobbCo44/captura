-- Lookup a loyalty member by email for a given brand
-- Returns contact_id + balance so returning consumers can recover their membership
-- without relying on localStorage
-- Checks loyalty_points table (not contacts.source) because a contact may have
-- originally signed up via promo/VIP and later joined loyalty
CREATE OR REPLACE FUNCTION lookup_loyalty_member(
  p_brand_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_contact_id UUID;
  v_balance JSONB;
BEGIN
  SELECT id INTO v_contact_id
  FROM contacts
  WHERE brand_id = p_brand_id AND email = lower(trim(p_email))
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Only return if they actually have loyalty history
  SELECT jsonb_build_object(
    'contact_id', v_contact_id,
    'balance', COALESCE(SUM(points), 0),
    'total_earned', COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0),
    'total_redeemed', COALESCE(SUM(CASE WHEN type = 'redeemed' THEN ABS(points) ELSE 0 END), 0)
  )
  INTO v_balance
  FROM loyalty_points
  WHERE contact_id = v_contact_id AND brand_id = p_brand_id
  HAVING COUNT(*) > 0;

  RETURN v_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION lookup_loyalty_member(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_loyalty_member(UUID, TEXT) TO anon, authenticated;
