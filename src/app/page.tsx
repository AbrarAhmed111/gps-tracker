'use client'

import AccessGate from '@/components/auth/AccessGate'
import Header from '@/components/dashboard/Header'
import MapView, { type VehicleMarker } from '@/components/dashboard/MapView'
import VehicleList from '@/components/dashboard/VehicleList'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { axiosInstance } from '@/utils/axios'

const MAX_WAYPOINTS_PER_ROUTE = 500

type Vehicle = {
  id: string
  name: string
  status: 'moving' | 'parked' | 'inactive'
  lat?: number
  lng?: number
  routeLabel?: string
  color?: string
  lastUpdated?: string
  speedKmh?: number
  etaNextMinutes?: number
  progressPercent?: number
  vehicleNumber?: string
  vehicleType?: string
  bearing?: number
  nextTarget?: { lat: number; lng: number } | null
  etaToNextMs?: number | null
}

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [refreshMinutes, setRefreshMinutes] = useState<number>(10)
  const [appName, setAppName] = useState<string>('GPS Simulation Dashboard')
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false)
  const loadingRef = useRef<boolean>(false)
  const [focusRequest, setFocusRequest] = useState<{ id: string; ts: number } | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['map_refresh_interval_sec', 'app_name', 'maintenance_mode_enabled'])
    if (!error && data) {
      const secStr =
        data.find(d => d.setting_key === 'map_refresh_interval_sec')
          ?.setting_value ?? '600'
      const sec = Number(secStr)
      if (Number.isFinite(sec) && sec > 0) {
        setRefreshMinutes(Math.max(1, Math.round(sec / 60)))
      }
      const name =
        data.find(d => d.setting_key === 'app_name')?.setting_value ??
        'GPS Simulation Dashboard'
      if (typeof name === 'string' && name.trim().length > 0) {
        setAppName(name)
      }
      const maint =
        data.find(d => d.setting_key === 'maintenance_mode_enabled')
          ?.setting_value ?? 'false'
      setMaintenanceMode(String(maint).toLowerCase() === 'true')
    }
  }, [])

  const MAX_WAYPOINTS_PER_ROUTE = 500

  const loadData = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setIsLoading(true)
    try {
      const supabase = createClient()
      // Vehicles
      const { data: vehiclesData, error: vErr } = await supabase
        .from('vehicles')
        .select('*')
        .eq('is_active', true)
      if (vErr) throw vErr
      const ids = (vehiclesData ?? []).map(v => v.id)
      if (ids.length === 0) {
        setVehicles([])
        return
      }
      // Active routes (one per vehicle enforced by index)
      const { data: routes } = await supabase
        .from('routes')
        .select('id, vehicle_id, route_name, is_active, monday, tuesday, wednesday, thursday, friday, saturday, sunday')
        .in('vehicle_id', ids)
        .eq('is_active', true)
      const vehicleIdToRoute: Record<
        string,
        {
          id: string
          name: string
          flags: { monday: boolean; tuesday: boolean; wednesday: boolean; thursday: boolean; friday: boolean; saturday: boolean; sunday: boolean }
        }
      > = {}
      for (const r of routes ?? []) {
        // @ts-ignore
        vehicleIdToRoute[r.vehicle_id] = {
          // @ts-ignore
          id: r.id,
          // @ts-ignore
          name: r.route_name,
          // @ts-ignore
          flags: {
            // coerce null -> false
            monday: !!r.monday, tuesday: !!r.tuesday, wednesday: !!r.wednesday, thursday: !!r.thursday, friday: !!r.friday, saturday: !!r.saturday, sunday: !!r.sunday,
          },
        }
      }
      const routeIds = Object.values(vehicleIdToRoute).map(r => r.id)
      if (routeIds.length === 0) {
        setVehicles([])
        return
      }
      const now = new Date()
      const nowIso = now.toISOString()
      const jsDay = now.getDay() // 0..6, 0=Sunday
      const mondayZeroDay = (jsDay + 6) % 7 // 0..6, 0=Monday

      // Fetch waypoints for these routes (filtered to active day)
      const { data: waypoints } = await supabase
        .from('waypoints')
        .select('route_id, sequence_number, latitude, longitude, timestamp, day_of_week, is_parking')
        .in('route_id', routeIds)
        .eq('day_of_week', mondayZeroDay)
        .order('sequence_number', { ascending: true })
        .limit(5000)
      // Group waypoints by route_id
      const routeIdToWaypoints = new Map<
        string,
        Array<{ sequence: number; latitude: number; longitude: number; timestamp: string; day_of_week: number; is_parking?: boolean }>
      >()
      for (const w of waypoints ?? []) {
        // @ts-ignore
        const key = w.route_id as string
        if (!routeIdToWaypoints.has(key)) routeIdToWaypoints.set(key, [])
        // @ts-ignore
        const lat = typeof w.latitude === 'number' ? w.latitude : Number(w.latitude)
        // @ts-ignore
        const lng = typeof w.longitude === 'number' ? w.longitude : Number(w.longitude)
        // @ts-ignore
        const ts = w.timestamp ? new Date(w.timestamp as string).toISOString() : new Date().toISOString()
        routeIdToWaypoints.get(key)!.push({
          // @ts-ignore
          sequence: w.sequence_number as number,
          latitude: lat,
          longitude: lng,
          timestamp: ts,
          // @ts-ignore
          day_of_week: (w.day_of_week ?? 0) as number,
          // @ts-ignore
          is_parking: Boolean(w.is_parking),
        })
      }
      // Prepare simulation batch request
      const vehiclesPayload = (vehiclesData ?? [])
        .map(v => {
          const routeInfo = vehicleIdToRoute[v.id]
          if (!routeInfo) return null
          const wps = (routeIdToWaypoints.get(routeInfo.id) ?? []).slice(0, MAX_WAYPOINTS_PER_ROUTE)
          const flags = routeInfo.flags
          const isActiveToday =
            mondayZeroDay === 0 ? flags.monday :
            mondayZeroDay === 1 ? flags.tuesday :
            mondayZeroDay === 2 ? flags.wednesday :
            mondayZeroDay === 3 ? flags.thursday :
            mondayZeroDay === 4 ? flags.friday :
            mondayZeroDay === 5 ? flags.saturday :
            flags.sunday
          return {
            vehicle_id: v.id,
            current_time: nowIso,
            day_of_week: mondayZeroDay,
            is_day_active: !!isActiveToday,
            waypoints: wps,
          }
        })
        .filter(Boolean) as any[]
      // Fetch current state as a fallback in case waypoints are empty or simulator returns no position
      const { data: simState } = await supabase
        .from('vehicle_simulation_state')
        .select('vehicle_id, current_latitude, current_longitude, simulation_active, is_parked')
        .in('vehicle_id', ids)
      const stateByVehicle = new Map<
        string,
        { lat: number | null; lng: number | null; active: boolean | null; parked: boolean | null }
      >()
      for (const s of simState ?? []) {
        // @ts-ignore
        stateByVehicle.set(s.vehicle_id as string, {
          // @ts-ignore
          lat: s.current_latitude != null ? Number(s.current_latitude) : null,
          // @ts-ignore
          lng: s.current_longitude != null ? Number(s.current_longitude) : null,
          // @ts-ignore
          active: s.simulation_active as boolean | null,
          // @ts-ignore
          parked: s.is_parked as boolean | null,
        })
      }
      // Call simulation API
      if (!axiosInstance.defaults.baseURL) {
        throw new Error('Backend base URL not configured. Set NEXT_PUBLIC_BACKEND_BASE_URL.')
      }
      const simResp = await axiosInstance.post('/api/v1/simulation/calculate-positions-batch', {
        current_time: nowIso,
        vehicles: vehiclesPayload,
        interpolation_method: 'linear',
      })
      const batchTimestamp: string | undefined = simResp.data?.timestamp
      const positions = simResp.data?.positions as Array<any> | undefined
      const posByVehicle = new Map<string, any>()
      for (const p of positions ?? []) {
        posByVehicle.set(p.vehicle_id, p)
      }
      const compiled: Vehicle[] =
        (vehiclesData ?? []).map(v => {
          const routeInfo = vehicleIdToRoute[v.id]
          const wps = routeInfo ? (routeIdToWaypoints.get(routeInfo.id) ?? []).slice(0, MAX_WAYPOINTS_PER_ROUTE) : []
          const pos = posByVehicle.get(v.id)
          let status: Vehicle['status'] = 'inactive'
          let lat: number | undefined
          let lng: number | undefined
          let speedKmh: number | undefined
          let etaNextMinutes: number | undefined
          let progressPercent: number | undefined
          let bearingDeg: number | undefined
          let nextTarget: { lat: number; lng: number } | null = null
          let etaToNextMs: number | null = null
          if (pos) {
            const s = (pos.status || '').toString().toLowerCase()
            if (s === 'parked' || s === 'completed' || s === 'not_started') status = 'parked'
            else if (s === 'moving') status = 'moving'
            // Python API returns position under pos.position
            const ppos = pos.position
            if (ppos && typeof ppos.latitude === 'number' && typeof ppos.longitude === 'number') {
              lat = ppos.latitude
              lng = ppos.longitude
            } else if (typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
              // fallback if shape changes
              lat = pos.latitude
              lng = pos.longitude
            }
            const mv = pos.movement_data
            if (mv && typeof mv.speed_kmh === 'number') {
              speedKmh = mv.speed_kmh
            }
            if (mv && typeof mv.bearing === 'number') {
              const raw = mv.bearing as number
              const mod = raw % 360
              bearingDeg = mod < 0 ? mod + 360 : mod
            }
            const eta = pos.eta
            if (eta && typeof eta.minutes_to_next_waypoint === 'number') {
              etaNextMinutes = eta.minutes_to_next_waypoint
              etaToNextMs = etaNextMinutes * 60 * 1000
            }
            const prog = pos.route_progress
            if (prog && typeof prog.overall_progress_percent === 'number') {
              progressPercent = prog.overall_progress_percent
            }
            const currentSeg = prog?.current_segment
            const segTo = currentSeg?.to_position
            if (segTo && typeof segTo.latitude === 'number' && typeof segTo.longitude === 'number') {
              nextTarget = {
                lat: segTo.latitude,
                lng: segTo.longitude,
              }
            }
          }
          // If simulation did not return a position but route has waypoints, fall back to first waypoint
          if ((lat == null || lng == null) && wps.length > 0) {
            const first = wps[0]
            if (typeof first.latitude === 'number' && typeof first.longitude === 'number') {
              lat = first.latitude
              lng = first.longitude
            }
          }
          // Final fallback: use last known simulation state
          if (lat == null || lng == null) {
            const st = stateByVehicle.get(v.id)
            if (st && st.lat != null && st.lng != null) {
              lat = st.lat
              lng = st.lng
              if (st.parked) status = 'parked'
              else if (st.active) status = 'moving'
            }
          }
          return {
            id: v.id,
            name: v.name,
            lat,
            lng,
            status,
            // @ts-ignore
            color: v.color || undefined,
            routeLabel: routeInfo?.name ?? '—',
            lastUpdated: batchTimestamp || nowIso,
            speedKmh,
            etaNextMinutes,
            progressPercent,
            // @ts-ignore
            vehicleNumber: v.vehicle_number || undefined,
            // @ts-ignore
            vehicleType: v.vehicle_type || undefined,
            bearing: bearingDeg,
            nextTarget,
            etaToNextMs,
          }
        }) ?? []
      setVehicles(compiled)
      setLastSyncedAt(batchTimestamp || nowIso)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load data')
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadData()
  }, [loadSettings, loadData])

  // Auto-refresh vehicles on interval based on settings
  useEffect(() => {
    const minutes = Math.max(1, Number(refreshMinutes) || 1)
    const id = setInterval(() => {
      loadData()
    }, minutes * 60 * 1000)
    return () => clearInterval(id)
  }, [refreshMinutes, loadData])

  const onManualRefresh = useCallback(() => {
    loadData()
  }, [loadData])

  const vehiclesForMap = useMemo<VehicleMarker[]>(
    () =>
      vehicles
        .filter(v => typeof v.lat === 'number' && typeof v.lng === 'number')
        .map(v => ({
          id: v.id,
          name: v.name,
          lat: v.lat as number,
          lng: v.lng as number,
          status: v.status,
          color: v.color,
          speedKmh: v.speedKmh,
          lastUpdated: v.lastUpdated,
          etaNextMinutes: v.etaNextMinutes,
          vehicleNumber: v.vehicleNumber,
          vehicleType: v.vehicleType,
          bearing: v.bearing,
          nextTarget: v.nextTarget ?? undefined,
          etaToNextMs: v.etaToNextMs ?? undefined,
        })),
    [vehicles],
  )

  function focusVehicle(id: string) {
    setFocusRequest({ id, ts: Date.now() })
  }

  if (maintenanceMode) {
    return (
      <AccessGate>
        <div className="min-h-screen grid place-items-center bg-gradient-to-b from-gray-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-4">
          <div className="max-w-md text-center rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-lg">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-500 font-semibold">Maintenance</p>
            <h1 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">We&rsquo;ll be right back</h1>
            <p className="mt-3 text-sm text-gray-600 dark:text-neutral-400">
              The public dashboard is temporarily unavailable while admins perform maintenance. Please check back soon.
            </p>
          </div>
        </div>
      </AccessGate>
    )
  }

  return (
    <AccessGate>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <Header
          title={appName}
          refreshMinutes={refreshMinutes}
          onManualRefresh={onManualRefresh}
          // @ts-ignore add optional props in header
          lastSyncedAt={lastSyncedAt || undefined}
          // @ts-ignore
          loading={isLoading}
        />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4">
              <VehicleList vehicles={vehicles} onFocus={focusVehicle} />
            </div>
            <div className="lg:col-span-8 h-[60vh] lg:h-[72vh]">
              <div className="h-full rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-800 shadow-sm">
                <MapView vehicles={vehiclesForMap} focusRequest={focusRequest || undefined} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </AccessGate>
  )
}
