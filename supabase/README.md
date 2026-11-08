# HADIRKU Supabase

This directory contains database migrations, Row Level Security policies, and future Edge Functions for the dedicated HADIRKU Supabase project.

## Current state
The initial multi-tenant attendance schema is deployed. See [database schema documentation](../docs/database/SCHEMA.md) and the ordered migrations in `migrations/`.

## Security rules
- Every organization-owned record includes `organization_id`.
- All exposed public tables have RLS enabled.
- Authorization is derived from trusted organization membership records, not user-editable metadata.
- No anonymous table privileges are granted.
- The `create_organization` RPC runs as SECURITY INVOKER and relies on RLS.
- Internal authorization helpers live in the non-exposed `private` schema.
- Never expose service-role keys or server secrets in web or Android clients.

## Migrations
Keep schema changes in ordered SQL files under `migrations/`. Verify each change against the live project, run Supabase security/performance advisors, and regenerate web database types after schema changes.
