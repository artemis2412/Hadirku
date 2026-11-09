# HADIRKU WhatsApp Business Platform

HADIRKU integrates only through the official Meta WhatsApp Business Platform / Cloud API. It does not automate personal WhatsApp accounts or browser sessions.

## Database foundation

- `whatsapp_settings`: organization-scoped phone number and WhatsApp Business Account identifiers. Provider credentials are not stored here.
- `whatsapp_consents`: per-person, per-recipient (self/guardian) opt-in/opt-out evidence. Phone numbers are stored in E.164 format.
- `whatsapp_templates`: organization-scoped template metadata and provider approval state.
- `whatsapp_messages`: idempotent message queue and current delivery state.
- `whatsapp_message_events`: append-only delivery event timeline; only the server-side worker can write events.

RLS scopes every row by organization membership and role. A database trigger rejects queue inserts unless the recipient has active recorded consent and the template is approved and active. Client users cannot update delivery states; provider workers will own those transitions.

## Provider credentials

For a single-business development connection, provider credentials may be stored as Supabase Edge Function Secrets:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

**Multi-tenant production requirement:** each organization may connect a different WABA and phone number. Do not use one global access token for all tenants. Implement per-organization credential storage encrypted with Supabase Vault or an external KMS, and keep the encryption/decryption path server-side only. The organization settings table stores only non-secret Meta identifiers (`phone_number_id`, `business_account_id`, display phone number).

## Activation checklist

1. Create/configure a Meta Business Portfolio and WhatsApp Business Account.
2. Add and verify a business phone number; obtain the Phone Number ID and WABA ID.
3. Add the provider secrets in the HADIRKU Supabase project.
4. Submit approved Utility templates in Meta WhatsApp Manager and record their exact provider names/languages.
5. Record documented recipient consent before any message is queued.
6. Deploy and test the authenticated queue worker and signed webhook handler before enabling sending in production.

## Compliance and reliability

- Respect opt-out immediately and never enqueue after consent is withdrawn.
- Use approved templates outside the customer-service window.
- Keep provider access tokens server-side only.
- Use idempotency keys, bounded retries, delivery status history, and webhook signature verification.
- Log provider message IDs and sanitized error codes; do not log access tokens or message secrets.
- Do not enable automatic bulk marketing; marketing requires separate lawful basis, consent and provider policy review.

## Current state

The database foundation and RLS are deployed. Sending is not enabled yet: Meta credentials, approved templates, worker, and webhook configuration are still required.
