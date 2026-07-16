-- TCPA consent compliance columns on promo_entries
ALTER TABLE promo_entries ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE promo_entries ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE promo_entries ADD COLUMN IF NOT EXISTS consent_ip TEXT;
ALTER TABLE promo_entries ADD COLUMN IF NOT EXISTS consent_text_shown TEXT;
ALTER TABLE promo_entries ADD COLUMN IF NOT EXISTS age_attestation BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE promo_entries ADD COLUMN IF NOT EXISTS age_attestation_timestamp TIMESTAMPTZ NOT NULL DEFAULT now();

-- Same columns on event_entries
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS consent_ip TEXT;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS consent_text_shown TEXT;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS age_attestation BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS age_attestation_timestamp TIMESTAMPTZ NOT NULL DEFAULT now();
