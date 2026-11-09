# HADIRKU Android

Native Android client built with Kotlin, Jetpack Compose, Room, and the Supabase Kotlin SDK.

## Stack

- Kotlin 2.4.21 + Jetpack Compose
- Android compile SDK 37, target SDK 36, minimum SDK 26
- Supabase Kotlin SDK 3.9.0 (Auth + PostgREST)
- Room 2.8.5 for local persistence
- KSP 2.3.10 for Room code generation
- Ktor Android engine 3.6.1
- Shared HADIRKU Supabase backend; no service-role keys in the APK

## Local configuration

Create `android/local.properties` (never commit it):

```properties
SUPABASE_URL=https://qmmdhjjezuflznapalbo.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_with_your_project_key
```

The publishable key is intended for public clients. Never place a Supabase secret/service-role key in this file or in the APK.

## Build

From the repository root:

```bash
cd android
gradle :app:assembleDebug
```

## Implemented

- Native Compose login using Supabase Auth.
- Persistent Supabase session state and deep-link callback registration (`hadirku://auth-callback`).
- Room database with local people, attendance sessions, attendance records, and sync outbox.
- Local-first attendance repository: attendance and its outbox operation are committed in one Room transaction.
- Stable deterministic attendance and outbox IDs so repeated offline edits replace the pending payload instead of creating duplicate operations.
- Pending outbox query, retry count, last-error tracking, and pending-count Flow.
- Organization-scoped local queries.

## Still to build

- Organization membership loading and organization switcher.
- Supabase pull/push sync worker with authentication, retry/backoff, and server conflict handling.
- Interactive Android attendance and member screens.
- End-to-end offline/online tests on physical devices.
