# HADIRKU

**HADIRKU** adalah platform presensi fleksibel untuk sekolah, yayasan, pesantren, perusahaan, tempat kursus, komunitas, dan organisasi lainnya.

## Struktur proyek
- `web/` — dashboard React + TypeScript.
- `android/` — aplikasi native Kotlin + Jetpack Compose.
- `supabase/` — migrasi database, kebijakan Row Level Security (RLS), dan Edge Functions.
- `docs/` — dokumentasi arsitektur dan pengembangan.

## Prinsip utama
- Isolasi data antarorganisasi (multi-tenant).
- Peran dan hak akses sesuai organisasi.
- Web dan Android menggunakan satu backend HADIRKU.
- Aplikasi Android dirancang tetap dapat mencatat presensi saat offline dan melakukan sinkronisasi dengan aman.
- Riwayat presensi dapat diaudit dan dilaporkan.

## Status awal
Fondasi repository dan dashboard web awal sudah tersedia. Autentikasi, skema database, alur presensi, penyimpanan offline Android, serta sinkronisasi akan dibangun bertahap.

Lihat `docs/architecture/OVERVIEW.md` untuk gambaran arsitektur.