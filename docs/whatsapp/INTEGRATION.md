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

Each organization's Cloud API access token is stored separately in Supabase Vault. The browser sends it to the authenticated `whatsapp-credentials` Edge Function; that function verifies the signed-in user is an active organization owner/admin before writing through a service-role-only RPC. The token is never returned to the browser or stored in the public settings table.

The webhook uses app-level Edge Function secrets:

- `WHATSAPP_VERIFY_TOKEN` — Meta webhook subscription verification.
- `WHATSAPP_APP_SECRET` — HMAC SHA-256 signature verification.

The worker uses `META_GRAPH_API_VERSION` (for example, a currently supported `vNN.0`) and the built-in `SUPABASE_SERVICE_ROLE_KEY`. The organization settings table stores only non-secret Meta identifiers (`phone_number_id`, `business_account_id`, display phone number).

## Activation checklist

1. Create/configure a Meta Business Portfolio and WhatsApp Business Account.
2. Add and verify a business phone number; obtain the Phone Number ID and WABA ID.
3. Add the provider secrets in the HADIRKU Supabase project.
4. Submit approved Utility templates in Meta WhatsApp Manager and record their exact provider names/languages.
5. Record documented recipient consent before any message is queued.
6. Configure `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, and `META_GRAPH_API_VERSION` in Supabase Edge Function Secrets.
7. Configure the Meta webhook URL as `https://qmmdhjjezuflznapalbo.supabase.co/functions/v1/whatsapp-webhook` and subscribe to the `messages` field.
8. Deploy and test the authenticated queue worker and signed webhook handler before enabling sending in production.

## Compliance and reliability

- Respect opt-out immediately and never enqueue after consent is withdrawn.
- Use approved templates outside the customer-service window.
- Keep provider access tokens server-side only.
- Use idempotency keys, bounded retries, delivery status history, and webhook signature verification.
- Log provider message IDs and sanitized error codes; do not log access tokens or message secrets.
- Do not enable automatic bulk marketing; marketing requires separate lawful basis, consent and provider policy review.

## Current state

The database foundation, per-organization Vault credential storage, authenticated credential endpoint, queue worker, and signed webhook handler are deployed. Sending remains disabled by default (`sending_enabled = false`) until Meta app secrets, a verified business phone, approved templates, consent records, and production tests are complete.
