'use client'

import AccessGate from '@/components/auth/AccessGate'
import Header from '@/components/dashboard/Header'
import MapView, { type VehicleMarker } from '@/components/dashboard/MapView'
import VehicleList from '@/components/dashboard/VehicleList'
import { useCallback, useMemo, useState } from 'react'

type Vehicle = VehicleMarker & { routeLabel?: string }

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: 'veh-1',
      name: 'Truck 101',
      lat: 38.9072,
      lng: -77.0369,
      status: 'moving',
      routeLabel: 'Mon Route v1',
    },
    {
      id: 'veh-2',
      name: 'Van 202',
      lat: 38.8895,
      lng: -77.0353,
      status: 'parked',
      routeLabel: 'Tue Route v2',
    },
    {
      id: 'veh-3',
      name: 'Car 303',
      lat: 38.8951,
      lng: -77.0703,
      status: 'inactive',
      routeLabel: '—',
    },
  ])

  const onManualRefresh = useCallback(() => {
    setVehicles(prev =>
      prev.map(v =>
        v.status === 'moving'
          ? {
              ...v,
              lat: v.lat + (Math.random() - 0.5) * 0.01,
              lng: v.lng + (Math.random() - 0.5) * 0.01,
            }
          : v,
      ),
    )
  }, [])

  const vehiclesForMap = useMemo(
    () =>
      vehicles.map(({ id, name, lat, lng, status }) => ({
        id,
        name,
        lat,
        lng,
        status,
      })),
    [vehicles],
  )

  function focusVehicle(id: string) {
    console.log('Focus vehicle', id)
  }

  return (
    <AccessGate>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <Header onManualRefresh={onManualRefresh} />
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
