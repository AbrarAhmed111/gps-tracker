GPS Simulation Dashboard - User Flow Documentation

═══════════════════════════════════════════════════════════════════════════════

ROLE 1: PUBLIC USER (Viewer/Monitor)

═══════════════════════════════════════════════════════════════════════════════

1. INITIAL ACCESS

   ├─ User visits the public dashboard URL

   ├─ System presents login/authentication page

   ├─ User enters credentials (username/password)

   └─ Next.js validates credentials via Supabase Auth

2. DASHBOARD VIEW (Main Interface)

   ├─ System loads the map-first interface

   ├─ Google Maps initializes with all active vehicle markers

   ├─ Left sidebar displays vehicle list with:

   │ ├─ Vehicle name

   │ ├─ Current status (Moving/Parked/Inactive)

   │ ├─ Last updated timestamp

   │ └─ Current location info

   └─ Header shows refresh indicator and last sync time

3. MONITORING VEHICLES

   ├─ User can:

   │ ├─ Click on vehicle markers to see details popup

   │ ├─ Click on vehicle in sidebar to center map on that vehicle

   │ ├─ Toggle between vehicles in the list

   │ └─ Switch between light/dark theme

   │

   ├─ Auto-refresh (every 10 minutes):

   │ ├─ Next.js calls FastAPI to get updated positions

   │ ├─ FastAPI calculates interpolated positions based on current time

   │ ├─ Map markers update smoothly to new positions

   │ └─ Vehicle status updates in sidebar

   │

   └─ Vehicle behavior observed:

   ├─ Moving vehicles show smooth transitions between points

   ├─ Parked vehicles remain stationary

   └─ Inactive vehicles (day not scheduled) stay at last position

4. VIEWING DETAILS

   ├─ Click on vehicle marker shows:

   │ ├─ Vehicle name

   │ ├─ Current coordinates

   │ ├─ Status (Moving/Parked)

   │ ├─ Speed (simulated)

   │ └─ Last update time

   │

   └─ Sidebar vehicle entry shows:

   ├─ Route progress (if applicable)

   └─ ETA to next waypoint (if moving)

5. SESSION END

   └─ User logs out or closes browser

═══════════════════════════════════════════════════════════════════════════════

ROLE 2: ADMIN USER (Management & Configuration)

═══════════════════════════════════════════════════════════════════════════════

1. INITIAL ACCESS

   ├─ Admin visits admin panel URL (e.g., /admin)

   ├─ System presents secure admin login

   ├─ Admin enters admin credentials

   └─ Next.js validates admin role via Supabase Auth

2. ADMIN DASHBOARD

   ├─ Navigation menu with sections:

   │ ├─ Vehicle Management

   │ ├─ Route Management

   │ ├─ User Management (optional)

   │ └─ System Settings

   │

   └─ Overview panel showing:

   ├─ Total vehicles

   ├─ Active routes

   ├─ System status

   └─ Recent activity log

3. VEHICLE MANAGEMENT

   A. VIEW VEHICLES

   ├─ Table/list displays all vehicles with:

   │ ├─ Vehicle ID/Name

   │ ├─ Status

   │ ├─ Active route

   │ ├─ Last updated

   │ └─ Action buttons (Edit/Delete/View)

   └─ Search and filter options

   B. ADD NEW VEHICLE

   ├─ Admin clicks "Add Vehicle" button

   ├─ Form appears with fields:

   │ ├─ Vehicle Name (required)

   │ ├─ Vehicle ID/Number (optional)

   │ ├─ Description (optional)

   │ ├─ Vehicle Type (dropdown)

   │ └─ Icon selection

   │

   ├─ Admin fills form and clicks "Save"

   ├─ Next.js validates input

   ├─ Next.js saves to Supabase database

   └─ Success message + vehicle appears in list

   C. EDIT VEHICLE

   ├─ Admin clicks "Edit" on vehicle row

   ├─ Pre-filled form appears

   ├─ Admin modifies fields

   ├─ Admin clicks "Update"

   ├─ Next.js updates Supabase database

   └─ Changes reflected immediately

   D. DELETE VEHICLE

   ├─ Admin clicks "Delete" on vehicle row

   ├─ Confirmation dialog appears

   ├─ Admin confirms deletion

   ├─ Next.js removes vehicle from Supabase

   ├─ Associated routes marked as inactive

   └─ Vehicle removed from list

4. ROUTE MANAGEMENT

   A. VIEW ROUTES

   ├─ Admin selects a vehicle

   ├─ System displays all routes for that vehicle:

   │ ├─ Route name/date uploaded

   │ ├─ Active days (checkboxes status)

   │ ├─ Number of waypoints

   │ ├─ Status (Active/Inactive)

   │ └─ Action buttons (Edit/Delete/Activate)

   └─ Route history available

   B. UPLOAD NEW ROUTE

   ├─ Admin clicks "Upload Route" for a vehicle

   ├─ Upload form appears:

   │ ├─ File upload field (accepts .xlsx, .xls, .csv)

   │ ├─ Route name/description

   │ └─ Active days checkboxes (Mon-Sun)

   │

   ├─ Admin selects Excel file and configures days

   ├─ Admin clicks "Upload"

   │

   ├─ Next.js receives file

   ├─ Next.js sends file to FastAPI endpoint: POST /api/process-route

   │

   ├─ FastAPI processes:

   │ ├─ Validates Excel format

   │ ├─ Extracts timestamp, lat/long (or address)

   │ ├─ Geocodes addresses if needed (uses cache first)

   │ ├─ Segments data by day of week

   │ ├─ Calculates route metadata

   │ ├─ Returns processed route data + cache info

   │

   ├─ Next.js receives processed data

   ├─ Next.js saves to Supabase:

   │ ├─ Route metadata

   │ ├─ Waypoint data

   │ ├─ Active days configuration

   │ └─ Cache entries for geocoded addresses

   │

   └─ Success message + route appears in list

   C. EDIT ROUTE SCHEDULE

   ├─ Admin clicks "Edit" on route

   ├─ Day selection checkboxes appear:

   │ ├─ Monday ☐

   │ ├─ Tuesday ☐

   │ ├─ Wednesday ☐

   │ ├─ Thursday ☐

   │ ├─ Friday ☐

   │ ├─ Saturday ☐

   │ └─ Sunday ☐

   │

   ├─ Admin toggles days (check/uncheck)

   ├─ Admin clicks "Save Schedule"

   ├─ Next.js updates active days in Supabase

   └─ Changes effective immediately in simulation

   D. ACTIVATE/DEACTIVATE ROUTE

   ├─ Admin clicks "Activate" or "Deactivate"

   ├─ Next.js updates route status in Supabase

   └─ Route starts/stops appearing in simulation

   E. DELETE ROUTE

   ├─ Admin clicks "Delete" on route

   ├─ Confirmation dialog appears

   ├─ Admin confirms deletion

   ├─ Next.js marks route as deleted in Supabase

   ├─ Route data archived (not hard deleted)

   └─ Vehicle shows "No active route"

   F. ROUTE HISTORY

   ├─ Admin clicks "View History" for vehicle

   ├─ System displays all past routes:

   │ ├─ Upload date

   │ ├─ Route name

   │ ├─ Status (Active/Archived)

   │ └─ Option to reactivate

   │

   ├─ Admin can reactivate old route

   └─ No new API calls needed (uses cached data)

5. REAL-TIME PREVIEW

   ├─ Admin panel includes mini-map preview

   ├─ Shows how public users see the simulation

   ├─ Can test route playback before making live

   └─ Simulation controls:

   ├─ Fast-forward time

   ├─ Pause/play

   └─ Jump to specific time of day

6. SYSTEM SETTINGS

   ├─ Configure refresh interval (default: 10 minutes)

   ├─ Manage Google Maps API key

   ├─ View API usage statistics

   ├─ Cache management:

   │ ├─ View cache size

   │ ├─ Clear specific entries

   │ └─ Force refresh geocodes

   └─ Backup/export data

7. SESSION END

   └─ Admin logs out

═══════════════════════════════════════════════════════════════════════════════

KEY INTERACTIONS BETWEEN NEXT.JS AND FASTAPI

═══════════════════════════════════════════════════════════════════════════════

1. ROUTE PROCESSING (Admin uploads Excel)

   Next.js → FastAPI: POST /api/process-route

   ├─ Payload: Excel file (multipart/form-data)

   ├─ FastAPI: Parse, validate, geocode (if needed), segment by day

   └─ Response: Processed route data, waypoints, metadata

2. POSITION CALCULATION (Public dashboard refresh)

   Next.js → FastAPI: POST /api/calculate-position

   ├─ Payload: { vehicle_id, current_time, route_data, active_day }

   ├─ FastAPI: Interpolate position based on time

   └─ Response: { lat, lng, status, bearing, speed }

3. GEOCODING (When address provided instead of coordinates)

   Next.js → FastAPI: POST /api/geocode

   ├─ Payload: { address, cache_key }

   ├─ FastAPI: Check cache, then Google Maps Geocoding API

   └─ Response: { lat, lng, cached: true/false }

4. ROUTE VALIDATION (Before saving)

   Next.js → FastAPI: POST /api/validate-route

   ├─ Payload: Route data structure

   ├─ FastAPI: Validate format, check for errors

   └─ Response: { valid: true/false, errors: [] }

═══════════════════════════════════════════════════════════════════════════════

DATA FLOW SUMMARY

═══════════════════════════════════════════════════════════════════════════════

PUBLIC USER FLOW:

Browser → Next.js → Supabase (get vehicle data) → FastAPI (calculate positions)
→ Next.js → Browser (update map)

ADMIN FLOW:

Browser → Next.js (UI) → FastAPI (process Excel) → Next.js (save to Supabase) →
Browser (confirmation)

═══════════════════════════════════════════════════════════════════════════════

EXAMPLE SCENARIOS

═══════════════════════════════════════════════════════════════════════════════

SCENARIO 1: Admin adds a new delivery vehicle with Monday-Friday route

1. Admin logs into admin panel

2. Clicks "Add Vehicle" → enters "Delivery Truck 01"

3. Uploads Excel file with route data

4. Checks Monday through Friday boxes

5. System processes route via FastAPI

6. Route saved to Supabase by Next.js

7. Public users immediately see vehicle on map (if today is Mon-Fri)

8. On Saturday/Sunday, vehicle shows at last Friday position

SCENARIO 2: Public user monitors vehicles during work hours

1. User logs into public dashboard at 9:00 AM

2. Sees 5 vehicles moving on map

3. Clicks on "Delivery Truck 01" marker

4. Views current location and status

5. Every 10 minutes, positions auto-update smoothly

6. At 12:00 PM, vehicle shows "Parked" (lunch break in route data)

7. At 12:30 PM, vehicle resumes movement

SCENARIO 3: Admin disables Wednesday route

1. Admin edits route for "Service Van 02"

2. Unchecks "Wednesday" checkbox

3. Saves changes

4. Next Wednesday, vehicle stays at Tuesday's final position

5. Public users see "Inactive" status for that vehicle

6. Thursday, vehicle resumes normal route
