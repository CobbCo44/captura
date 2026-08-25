# Klaviyo Manual Verification Steps

If you don't have a `KLAVIYO_API_KEY` to automate checking, follow these steps in the brand's Klaviyo dashboard to confirm that Shopify consent is flowing through correctly.

## 1. Check the Shopify integration settings

1. In Klaviyo, go to **Settings > Integrations > Shopify**.
2. Make sure **Sync SMS consent from Shopify** is toggled ON. This is off by default. If it's off, Klaviyo will ignore the SMS consent state we write to Shopify.
3. Confirm the integration is connected and syncing (you should see a "Last synced" timestamp).

## 2. Find a test customer

1. Go to **Profiles** in Klaviyo.
2. Search for the test email (e.g. `test+consent-in-xxxxx@meetcaptura.com`).
3. Click into the profile.

## 3. Verify email subscription

1. On the profile page, look at the **Email** subscription status.
2. It should show **Subscribed** if the customer checked the marketing consent box.
3. If the customer did NOT check the box, it should show **Never subscribed** (not "Unsubscribed").

## 4. Verify SMS subscription

1. On the same profile page, look at the **SMS** subscription status.
2. It should show **Subscribed** if the customer checked the marketing consent box AND provided a phone number.
3. The phone should appear in E.164 format: `+1XXXXXXXXXX`.

## 5. Check tags arrived as properties

1. Still on the profile page, scroll to **Custom Properties**.
2. Look for a property called `tags` or `shopify_tags` (depends on your Klaviyo setup).
3. Confirm it contains the expected tags: `captura`, `promo`, product name, `serial:XXX`, `gtin:XXX`, etc.

## Important: Klaviyo must be the SMS sender

Even if Klaviyo shows a customer as SMS-subscribed, Klaviyo can only send them texts if:
- Klaviyo is configured as the brand's SMS sender (not a third party like Postscript or Attentive).
- The brand has a toll-free number or short code set up in Klaviyo.
- The brand's SMS compliance setup is complete (company info, terms of service link, etc.).

If the brand uses a different SMS provider, the consent written to Shopify will not result in texts from Klaviyo. The brand would need to pull consent from Shopify into their actual SMS provider separately.
