# HADIRKU Supabase

This directory contains database migrations, Row Level Security policies, and Edge Functions for the dedicated HADIRKU Supabase project.

## Rules
- All organization-owned records must include organization_id.
- Enable RLS on every exposed table and test cross-tenant isolation.
- Resolve authorization from trusted database membership records, not user-editable metadata.
- Never expose service-role keys in web or Android clients.
- Keep schema changes in ordered SQL migrations.

No schema migrations have been applied yet. Review and test the initial schema before production data is added.