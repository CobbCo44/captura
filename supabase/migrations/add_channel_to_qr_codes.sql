-- Add channel_id to qr_codes so non-serialized QR codes can be tagged with a retail channel
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_qr_channel ON qr_codes(channel_id);
