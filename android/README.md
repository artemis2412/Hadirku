# HADIRKU Android

Native Android client built with Kotlin, Jetpack Compose, and Supabase Kotlin SDK.

## Stack

- Kotlin 2.4.21 + Jetpack Compose
- Supabase Kotlin SDK 3.9.0 (Auth + PostgREST)
- Ktor Android engine 3.6.1
- Minimum Android SDK 26
- Shared HADIRKU Supabase backend; no service-role keys in the APK

## Local configuration

Create `android/local.properties` (never commit it):

```properties
SUPABASE_URL=https://qmmdhjjezuflznapalbo.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_with_your_project_key
```

The publishable key is safe for public clients. Never place a Supabase secret/service-role key in this file or in the APK.

## Build

From the repository root:

```bash
cd android
gradle :app:assembleDebug
```

## Current implementation

- Native Compose login using Supabase Auth.
- Persistent Supabase session state.
- Deeplink callback registration (`hadirku://auth-callback`).
- Initial workspace shell for attendance, members, and reports.

## Next

- Organization membership and organization switcher.
- Room database and offline attendance outbox.
- Sync worker with idempotency and conflict handling.
- Attendance session and record screens.
