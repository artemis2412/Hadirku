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
