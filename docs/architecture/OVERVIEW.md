# HADIRKU — Architecture Overview

HADIRKU is a multi-tenant attendance platform for schools, foundations, pesantren, companies, courses, communities, and other organizations.

## Applications
- `web/`: React + TypeScript dashboard.
- `android/`: Kotlin + Jetpack Compose native application.
- `supabase/`: PostgreSQL schema, migrations, Row Level Security policies, and Edge Functions.

## Backend
Both clients use the dedicated HADIRKU Supabase project. Every organization-owned record must be scoped by `organization_id`, with access enforced by PostgreSQL Row Level Security.

## Security principles
- Never trust user-editable metadata for authorization.
- Never expose service-role or secret keys in client applications.
- Enable and test RLS on every exposed table.
- Support users belonging to multiple organizations with organization-specific roles.

## Offline attendance
The Android app will use Room for local data and an outbox-based synchronization flow. Sync operations must be idempotent and auditable.

## Initial modules
Organizations, memberships and roles, organizational units, people, attendance sessions and records, reports, and notification delivery.


## Current database foundation
The first schema is deployed with organizations, memberships, organizational units, people, attendance statuses, sessions, and attendance records. All tenant-owned records are scoped by organization ID and protected by RLS. Organization onboarding creates the tenant and its first owner membership atomically through a SECURITY INVOKER RPC.
