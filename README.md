# HADIRKU

**HADIRKU** adalah platform presensi fleksibel untuk sekolah, yayasan, pesantren, perusahaan, tempat kursus, komunitas, dan organisasi lainnya.

## Struktur proyek
- `web/` — dashboard React + TypeScript.
- `android/` — aplikasi native Kotlin + Jetpack Compose.
- `supabase/` — migrasi database, kebijakan Row Level Security (RLS), dan Edge Functions.
- `docs/` — dokumentasi arsitektur, skema database, dan pengembangan.

## Status pengembangan
- Fondasi dashboard web responsif tersedia.
- Proyek Supabase khusus HADIRKU sudah aktif.
- Delapan tabel inti multi-organisasi sudah diterapkan dengan RLS.
- Alur onboarding organisasi atomik dan perlindungan agar organisasi selalu memiliki pemilik aktif sudah disiapkan.
- Tipe TypeScript database sudah dihasilkan dari skema aktual.
- Autentikasi web, alur presensi lengkap, aplikasi Android, dan sinkronisasi offline masih dalam tahap pengembangan.

## Prinsip utama
- Isolasi data antarorganisasi (multi-tenant).
- Peran dan hak akses sesuai organisasi.
- Web dan Android menggunakan satu backend.
- Android dirancang tetap dapat mencatat presensi saat offline dan melakukan sinkronisasi dengan aman.
- Riwayat presensi dapat diaudit dan dilaporkan.

Mulai dari [panduan web](web/README.md), [arsitektur](docs/architecture/OVERVIEW.md), dan [skema database](docs/database/SCHEMA.md).
