# HADIRKU Web

React + TypeScript + Vite dashboard.

## Requirements
- Node.js 22 or newer
- npm

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the HADIRKU Supabase project.
3. Install dependencies with `npm install`.
4. Start the dashboard with `npm run dev`.

## Commands
- `npm run dev` — local development server.
- `npm run build` — TypeScript check and production build.
- `npm run preview` — preview the production build.

The Supabase client uses the generated `src/lib/database.types.ts` types. Only a publishable key belongs in browser code. Never place a service-role key or secret key in a Vite environment variable.


## Menjalankan aplikasi

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` dari pengaturan API project HADIRKU.
3. Jalankan `npm install`, lalu `npm run dev`.
4. Untuk produksi, jalankan `npm run build`.

Gunakan hanya publishable key pada aplikasi browser. Jangan pernah memasukkan service-role key atau secret key ke variabel `VITE_*`.

## Alur yang sudah tersedia

- Registrasi email dan kata sandi.
- Login, logout, dan permintaan email pemulihan kata sandi.
- Pengambilan daftar organisasi dari membership akun aktif.
- Pembuatan organisasi melalui RPC `create_organization` yang berjalan dengan otorisasi RLS.
- Ringkasan jumlah anggota aktif dan sesi presensi dari database.

Email confirmation mengikuti pengaturan Supabase Auth. Untuk pengembangan, tambahkan URL lokal dan URL produksi ke daftar Redirect URLs pada Supabase Auth. Modul anggota, unit, pencatatan presensi, dan laporan akan disambungkan bertahap setelah alur akun dan organisasi stabil.
