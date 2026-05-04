# GPS Tracking Dashboard

A Next.js dashboard for monitoring simulated vehicle routes on a live map. The app combines a password-protected public tracking view with an admin panel for managing vehicles, route files, public access, and system settings.

## Overview

GPS Tracking Dashboard is built for route simulation and fleet monitoring workflows. Admin users upload route data from Excel files, assign routes to vehicles, and configure access. Public users can then view vehicle positions, statuses, and smooth movement on a Google Maps based dashboard.

The frontend stores application data in Supabase and calls a backend simulation API for Excel processing and vehicle position calculations.

## Features

- Public dashboard protected by a shared access password.
- Google Maps view with live vehicle markers, status indicators, and focus controls.
- Smooth vehicle animation using waypoint progression, distance calculations, and route interpolation.
- Admin authentication with Supabase Auth.
- Vehicle management for names, numbers, types, colors, and active status.
- Route management with Excel upload, route activation, weekday scheduling, and waypoint storage.
- Public user management, password updates, and force logout support.
- System settings for app name, refresh interval, maintenance mode, and map/API configuration.
- Dark mode friendly UI built with Tailwind CSS.

## Tech Stack

- Next.js 15 with App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase Auth and Database
- Google Maps JavaScript API
- Axios for backend API calls
- Redux Toolkit
- Jest and Testing Library
- ESLint, Prettier, Husky, and lint-staged

## Requirements

- Node.js 18 or newer
- npm
- Supabase project with the required tables and auth configuration
- Google Maps API key stored in system settings
- Backend API for Excel processing and simulation calculations

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8000

# Optional
BACKEND_BASE_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_DEBUG=false
```

Important: `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only. Do not expose it in client code or commit it to source control.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Build for production:

```bash
npm run build
npm run start
```

## App Routes

| Route | Description |
| --- | --- |
| `/` | Public GPS tracking dashboard |
| `/admin/signin` | Admin sign in |
| `/admin` | Admin dashboard |
| `/admin/vehicles` | Manage vehicles |
| `/admin/routes` | Upload and manage routes |
| `/admin/public-users` | Manage public dashboard access |
| `/admin/users` | Manage admin users |
| `/admin/settings` | Configure system settings |

## Route Upload Format

Routes are uploaded from Excel files and processed by the backend API. Required columns:

| Column | Description |
| --- | --- |
| `timestamp` | Scheduled time for the waypoint |
| `day_of_week` | Number from `0` to `6`, where Monday is `0` and Sunday is `6` |
| `address` | Address used for geocoding when coordinates are missing |

Optional columns include `latitude`, `longitude`, `sequence`, `is_parking`, `parking_duration_minutes`, and `notes`.

See `docs/excel-format-specification.md` for the complete file format.

## Backend API Integration

The frontend expects the backend base URL in `NEXT_PUBLIC_BACKEND_BASE_URL`. Current integrations include:

- `POST /api/v1/excel/process` for parsing uploaded Excel route files.
- `POST /api/v1/simulation/calculate-positions-batch` for calculating current vehicle positions.

If this variable is missing, route uploads and live simulation data will fail.

## Project Structure

```text
src/
  app/                 Next.js App Router pages and API routes
  app/admin/           Admin authentication and dashboard pages
  app/api/             Public and admin API handlers
  components/          Dashboard, admin, and auth UI components
  lib/                 Supabase clients, auth helpers, and shared types
  store/               Redux store setup
  utils/               Shared utilities such as Axios configuration
  assets/              Global styles and static assets
docs/
  excel-format-specification.md
  user-flow.md
  dynamic-animation-feature.md
```

## Scripts

```bash
npm run dev          # Start local development
npm run build        # Create a production build
npm run start        # Start the production server
npm run lint         # Run ESLint with autofix
npm run format       # Format files with Prettier
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

## Documentation

- `docs/user-flow.md` explains the public and admin workflows.
- `docs/excel-format-specification.md` documents supported route upload columns.
- `docs/dynamic-animation-feature.md` explains the smooth vehicle animation behavior.

## Notes

- Public dashboard access is controlled by the `public_access` table and an HTTP-only session cookie.
- Admin access uses Supabase Auth and active admin profiles.
- The Google Maps API key is loaded from Supabase system settings.
- Route simulation repeats weekly using `day_of_week` values.
