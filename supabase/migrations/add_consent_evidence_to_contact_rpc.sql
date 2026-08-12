-- Update get_or_create_contact to store TCPA consent evidence
-- (timestamp, IP, and verbatim consent text shown to the consumer)
-- The contacts table already has sms_consent_at and sms_consent_text columns.

DROP FUNCTION IF EXISTS get_or_create_contact(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION get_or_create_contact(
  p_brand_id UUID,
  p_first_name TEXT,
  p_email TEXT,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'promo',
  p_sms_consent BOOLEAN DEFAULT FALSE,
  p_sms_consent_at TIMESTAMPTZ DEFAULT NULL,
  p_sms_consent_text TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  INSERT INTO contacts (brand_id, first_name, last_name, email, phone, source, sms_consent, sms_consent_at, sms_consent_text)
  VALUES (p_brand_id, p_first_name, p_last_name, lower(trim(p_email)), p_phone, p_source, p_sms_consent,
          CASE WHEN p_sms_consent THEN COALESCE(p_sms_consent_at, NOW()) ELSE NULL END,
          CASE WHEN p_sms_consent THEN p_sms_consent_text ELSE NULL END)
  ON CONFLICT (brand_id, email)
  DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = COALESCE(EXCLUDED.last_name, contacts.last_name),
    phone = COALESCE(EXCLUDED.phone, contacts.phone),
    sms_consent = CASE WHEN EXCLUDED.sms_consent THEN TRUE ELSE contacts.sms_consent END,
    sms_consent_at = CASE WHEN EXCLUDED.sms_consent AND NOT contacts.sms_consent
                     THEN COALESCE(EXCLUDED.sms_consent_at, NOW())
                     ELSE contacts.sms_consent_at END,
    sms_consent_text = CASE WHEN EXCLUDED.sms_consent AND NOT contacts.sms_consent
                       THEN EXCLUDED.sms_consent_text
                       ELSE contacts.sms_consent_text END
  RETURNING id INTO v_contact_id;

  RETURN v_contact_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_or_create_contact(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_contact(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TEXT) TO anon, authenticated;
