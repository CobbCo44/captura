-- Complimentary plans: an admin can give a brand a plan for free (no Stripe).
-- comp_tier: NULL (none) | 'starter' | 'growth' | 'pro'
ALTER TABLE brands ADD COLUMN IF NOT EXISTS comp_tier TEXT;

-- Billing columns may only be written by the server (service role: Stripe
-- webhook, sync, admin functions) or directly in the SQL editor. Signed-in
-- owners can still edit the rest of their brand, but any change they make to
-- these columns is ignored, so nobody can grant themselves a plan.
CREATE OR REPLACE FUNCTION protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.stripe_customer_id := NULL;
      NEW.stripe_subscription_id := NULL;
      NEW.subscription_status := NULL;
      NEW.trial_ends_at := NULL;
      NEW.cancel_at := NULL;
      NEW.billing_updated_at := NULL;
      NEW.comp_tier := NULL;
      NEW.tier := 'starter';
    ELSE
      NEW.stripe_customer_id := OLD.stripe_customer_id;
      NEW.stripe_subscription_id := OLD.stripe_subscription_id;
      NEW.subscription_status := OLD.subscription_status;
      NEW.trial_ends_at := OLD.trial_ends_at;
      NEW.cancel_at := OLD.cancel_at;
      NEW.billing_updated_at := OLD.billing_updated_at;
      NEW.comp_tier := OLD.comp_tier;
      NEW.tier := OLD.tier;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brands_protect_billing ON brands;
CREATE TRIGGER brands_protect_billing
  BEFORE INSERT OR UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION protect_billing_columns();
