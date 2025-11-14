'use client'

import AccessGate from '@/components/auth/AccessGate'
import Header from '@/components/dashboard/Header'
import MapView, { type VehicleMarker } from '@/components/dashboard/MapView'
import VehicleList from '@/components/dashboard/VehicleList'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

type Vehicle = {
  id: string
  name: string
  status: 'moving' | 'parked' | 'inactive'
  lat?: number
  lng?: number
  routeLabel?: string
}

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [refreshMinutes, setRefreshMinutes] = useState<number>(10)
  const [appName, setAppName] = useState<string>('GPS Simulation Dashboard')
  const loadingRef = useRef<boolean>(false)

  const loadSettings = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['map_refresh_interval_sec', 'app_name'])
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
    }
  }, [])

  const loadData = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const supabase = createClient()
      // Vehicles
      const { data: vehiclesData, error: vErr } = await supabase
        .from('vehicles')
        .select('id, name, is_active')
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
        .select('vehicle_id, route_name, is_active')
        .in('vehicle_id', ids)
        .eq('is_active', true)
      const vehicleIdToRoute: Record<string, string> = {}
      for (const r of routes ?? []) {
        // @ts-ignore
        vehicleIdToRoute[r.vehicle_id] = r.route_name
      }
      // Simulation state
      const { data: state } = await supabase
        .from('vehicle_simulation_state')
        .select(
          'vehicle_id, current_latitude, current_longitude, simulation_active, is_parked',
        )
        .in('vehicle_id', ids)
      const stateMap = new Map<
        string,
        {
          lat: number | null
          lng: number | null
          active: boolean | null
          parked: boolean | null
        }
      >()
      for (const s of state ?? []) {
        // @ts-ignore
        const lat =
          s.current_latitude != null ? Number(s.current_latitude) : null
        // @ts-ignore
        const lng =
          s.current_longitude != null ? Number(s.current_longitude) : null
        // @ts-ignore
        const active = s.simulation_active as boolean | null
        // @ts-ignore
        const parked = s.is_parked as boolean | null
        // @ts-ignore
        stateMap.set(s.vehicle_id as string, { lat, lng, active, parked })
      }
      const compiled: Vehicle[] =
        (vehiclesData ?? []).map(v => {
          const st = stateMap.get(v.id)
          let status: Vehicle['status'] = 'inactive'
          let lat: number | undefined = undefined
          let lng: number | undefined = undefined
          if (st) {
            if (st.parked) status = 'parked'
            else if (st.active) status = 'moving'
            if (st.lat != null && st.lng != null) {
              lat = st.lat
              lng = st.lng
            }
          }
          return {
            id: v.id,
            name: v.name,
            lat,
            lng,
            status,
            routeLabel: vehicleIdToRoute[v.id] ?? '—',
          }
        }) ?? []
      setVehicles(compiled)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load data')
    } finally {
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadData()
  }, [loadSettings, loadData])

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
        })),
    [vehicles],
  )

  function focusVehicle(id: string) {
    // Could integrate to pan/zoom map via context or ref
    console.log('Focus vehicle', id)
  }

  return (
    <AccessGate>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <Header
          title={appName}
          refreshMinutes={refreshMinutes}
          onManualRefresh={onManualRefresh}
        />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4">
              <VehicleList vehicles={vehicles} onFocus={focusVehicle} />
            </div>
            <div className="lg:col-span-8 h-[60vh] lg:h-[72vh]">
              <div className="h-full rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-800 shadow-sm">
                <MapView vehicles={vehiclesForMap} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </AccessGate>
  )
}
