# GPS Simulation Dashboard (Frontend)

Next.js + Supabase dashboard for simulated GPS tracking with a public map and a secure admin panel. This README covers only the frontend; the backend service is integrated via HTTP and configured in environment variables.

## Features

- Next.js 15 App Router, TypeScript, Tailwind CSS
- Supabase Auth (admin users), SQL schema, RLS policies
- Public dashboard gated by a shared password (cookie session + admin bypass)
- Google Maps with dynamic API key from DB and road-following marker animation
- Admin panel: overview, vehicles, routes (Excel upload), users, public users, settings
- Excel ingestion + (optional) geocoding via external API
- Simulation positions fetched from an external Python API and rendered live

## Prerequisites

- Node.js 18+
- Supabase project (URL + anon key + service role key)
- Google Maps API key (Browser key for Maps JS)
- External backend base URL (Python API) reachable from the browser

## Quick Start

1) Install
```bash
npm install
```

2) Configure environment
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8000
```

3) Initialize database
- Open Supabase SQL editor and run `src/lib/types/schema.sql`.
- Seed `system_settings`:
  - `app_name` = e.g. "GPS Simulation Dashboard"
  - `map_refresh_interval_sec` = e.g. "10"
  - `google_maps_api_key` = your Maps browser key
- Create a public password record in `public_access` (UI supports changing it later).

4) Start dev
```bash
npm run dev
# visit http://localhost:3000
```

## How It Works

- Public `/`:
  - Access protected by `AccessGate` (cookie or admin session).
  - Loads active vehicles, their active routes + waypoints from Supabase.
  - Calls `${NEXT_PUBLIC_BACKEND_BASE_URL}/api/v1/simulation/calculate-positions-batch` for current positions.
  - Map uses DB key (`system_settings.google_maps_api_key`) and animates markers.

- Admin panel `/admin`:
  - Sign in/up with Supabase Auth.
  - Settings updates `system_settings` (app name, refresh interval, Maps key).
  - Vehicles CRUD.
  - Routes: upload Excel → parse via external API → (optionally) geocode missing points using `${BACKEND}/api/v1/geocoding/batch` with the API key from DB → persist to `routes` and `waypoints`.
  - Users: create/delete via Supabase Admin API (requires `SUPABASE_SERVICE_ROLE_KEY`).
  - Public users: change public password, view logs, sign out all (nonce rotation).

## Excel Upload

- Expected columns (case-insensitive): `timestamp`, `latitude`, `longitude`
- Optional: `day_of_week` (0=Mon..6=Sun), `is_parking`, `address`, `notes`
- Missing coords + address → batch geocoding via external API with `api_key` from DB.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side API routes only)
- `NEXT_PUBLIC_BACKEND_BASE_URL` (external API root, no trailing slash)

Optional:
- `NEXT_PUBLIC_AUTH_DEBUG=true` (verbose auth logs)

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run start` – start production
- `npm run lint` – ESLint
- `npm run format` – Prettier

## Project Structure (Frontend)

```
src/
├── app/                      # App Router pages & API routes
│   ├── admin/                # Admin UI
│   ├── api/                  # Next.js API (auth, public gate, admin users)
│   └── page.tsx              # Public dashboard
├── assets/                   # CSS / images
├── components/               # UI components
├── lib/                      # Supabase clients, middleware, types, schema.sql
└── utils/axios.ts            # External API client (reads BACKEND_BASE_URL)
```

## Common Pitfalls

- Map not loading: ensure `google_maps_api_key` exists in DB.
- No markers: ensure at least one active route per vehicle with waypoints.
- Not Found calling external API: set `NEXT_PUBLIC_BACKEND_BASE_URL` (includes `/api` prefix in code).
- Admin user creation fails: verify `SUPABASE_SERVICE_ROLE_KEY` is set in deployment.

## License

MIT. See LICENSE.
