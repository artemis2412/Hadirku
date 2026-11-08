# HADIRKU Android

Native Android client planned with Kotlin and Jetpack Compose.

## Planned foundation
- Kotlin + Jetpack Compose UI
- Supabase Auth and API integration
- Room database for offline attendance data
- Outbox-based synchronization with idempotent requests
- Organization-aware role and permission handling

The Android application will share the dedicated HADIRKU Supabase backend with the web dashboard. Never put Supabase service-role keys or server secrets in the APK.