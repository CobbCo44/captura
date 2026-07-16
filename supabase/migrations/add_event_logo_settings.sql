-- Add logo customization to events for the scan page
ALTER TABLE events ADD COLUMN IF NOT EXISTS logo_size INTEGER DEFAULT 48;
ALTER TABLE events ADD COLUMN IF NOT EXISTS logo_align TEXT DEFAULT 'center';
