# HADIRKU

**HADIRKU** adalah platform presensi fleksibel untuk sekolah, yayasan, pesantren, perusahaan, tempat kursus, komunitas, dan organisasi lainnya.

## Struktur proyek

- `web/` — dashboard React + TypeScript.
- `android/` — aplikasi native Kotlin + Jetpack Compose.
- `supabase/` — migrasi database, kebijakan Row Level Security (RLS), dan Edge Functions.
- `docs/` — dokumentasi arsitektur, skema database, dan pengembangan.

## Status pengembangan

- Dashboard web dengan autentikasi, onboarding organisasi, dan pemilihan organisasi.
- Manajemen unit/kelas dan data anggota.
- Presensi harian, sesi presensi, dan riwayat.
- Laporan dengan ekspor CSV, Excel, dan PDF.
- Backend Supabase khusus HADIRKU dengan isolasi multi-organisasi dan RLS.
- Fondasi WhatsApp Business resmi: persetujuan penerima, template, antrean, Vault credential per organisasi, worker, dan webhook. Pengiriman masih dinonaktifkan sampai akun Meta dan template resmi siap.
- Aplikasi Android Native awal dengan Kotlin, Jetpack Compose, Supabase Auth, dan PostgREST.
- Room offline database, antrean sinkronisasi, pengujian perangkat, dan rilis APK masih dalam tahap berikutnya.

## Prinsip utama

- Isolasi data antarorganisasi (multi-tenant).
- Peran dan hak akses sesuai organisasi.
- Web dan Android menggunakan satu backend.
- Android dirancang tetap dapat mencatat presensi saat offline dan melakukan sinkronisasi dengan aman.
- Riwayat presensi dapat diaudit dan dilaporkan.

Mulai dari [panduan web](web/README.md), [panduan Android](android/README.md), [arsitektur](docs/architecture/OVERVIEW.md), dan [skema database](docs/database/SCHEMA.md).
