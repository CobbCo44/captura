-- Save the retail channel (and the exact serialized unit) on every consumer
-- entry when it's created, instead of guessing it later from a QR code.
-- consumer-submit fills these server-side from the scanned serial's batch.

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['vip_members', 'promo_entries', 'warranty_registrations', 'event_entries'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE SET NULL', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS serial_id UUID REFERENCES serials(id) ON DELETE SET NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (channel_id)', t || '_channel_id_idx', t);
    -- Existing entries: carry over the channel of the QR code they came from
    EXECUTE format('UPDATE %I e SET channel_id = q.channel_id FROM qr_codes q WHERE e.qr_code_id = q.id AND e.channel_id IS NULL AND q.channel_id IS NOT NULL', t);
  END LOOP;
END $$;
