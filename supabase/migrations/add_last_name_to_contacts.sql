-- Add last_name column to contacts if it doesn't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Drop old function signature and create new one with p_last_name
DROP FUNCTION IF EXISTS get_or_create_contact(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION get_or_create_contact(
  p_brand_id UUID,
  p_first_name TEXT,
  p_email TEXT,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'promo',
  p_sms_consent BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  INSERT INTO contacts (brand_id, first_name, last_name, email, phone, source, sms_consent)
  VALUES (p_brand_id, p_first_name, p_last_name, lower(trim(p_email)), p_phone, p_source, p_sms_consent)
  ON CONFLICT (brand_id, email)
  DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = COALESCE(EXCLUDED.last_name, contacts.last_name),
    phone = COALESCE(EXCLUDED.phone, contacts.phone),
    sms_consent = CASE WHEN EXCLUDED.sms_consent THEN TRUE ELSE contacts.sms_consent END
  RETURNING id INTO v_contact_id;

  RETURN v_contact_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_or_create_contact(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_contact(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated;
