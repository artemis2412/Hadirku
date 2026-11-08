# HADIRKU database foundation

The initial schema is deployed to the dedicated HADIRKU Supabase project (PostgreSQL 17).

## Core tables
- `profiles`: user-facing profile fields linked to Supabase Auth.
- `organizations`: tenant/workspace records.
- `organization_memberships`: user-to-organization membership and organization-scoped role.
- `organization_units`: classes, departments, divisions, teams, branches, and groups.
- `people`: organization-specific students, employees, teachers, and members.
- `attendance_statuses`: configurable attendance labels and reporting flags.
- `attendance_sessions`: a dated attendance event, optionally scoped to a unit.
- `attendance_records`: one person's status in one session.

## Tenant isolation
Every tenant-owned table contains `organization_id`. Composite foreign keys tie units, people, sessions, statuses, and attendance records to the same organization, preventing cross-organization references at the database level.

All eight public tables have Row Level Security enabled. There are no anonymous table grants. Authenticated users receive table privileges only subject to RLS policies. Authorization is based on trusted membership rows, never user-editable Auth metadata.

## Roles
- `owner`: full organization control.
- `admin`: organization and membership administration.
- `manager`: operational administration.
- `staff`: manage units, people, sessions, and attendance.
- `member`: read their own person/attendance record and organization-level session/status information.
- `guardian`: reserved for guardian-specific access flows to be added after relationship modeling.

The last active owner cannot be demoted, suspended, or deleted while no other active owner exists.

## Onboarding
Call the authenticated RPC `create_organization(p_name, p_organization_type, p_timezone)`. It creates the organization and the caller's owner membership in one transaction. The function is SECURITY INVOKER, so normal RLS policies authorize both inserts.

A database trigger creates the user's profile when a Supabase Auth account is registered. Another trigger seeds seven editable attendance statuses for each new organization.

## Attendance defaults
Hadir, Terlambat, Izin, Sakit, Alpa, Cuti, and Dinas Luar. Organizations may later customize labels and status behavior.

## Migrations
The applied migration sequence is in `supabase/migrations/`. Apply future schema changes through reviewed, ordered migrations. Regenerate `web/src/lib/database.types.ts` after schema changes.

## Follow-up work
- Automated RLS tests with separate users and organizations.
- Guardian-to-person relationship table and scoped guardian policies.
- Audit history for attendance corrections and membership changes.
- Invitations, schedules, QR/GPS/photo attendance, and offline sync queue.
- Verify Data API access settings before client integration.
