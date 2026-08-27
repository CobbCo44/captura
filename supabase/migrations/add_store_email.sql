-- Public contact email for the storefront (shown as "Email Us" on the scan page,
-- distinct from the account owner's login email).
ALTER TABLE brands ADD COLUMN IF NOT EXISTS store_email TEXT;
