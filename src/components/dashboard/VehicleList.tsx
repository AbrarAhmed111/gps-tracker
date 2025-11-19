'use client'

import { useState } from 'react'

type VehicleStatus = 'moving' | 'parked' | 'inactive'
type VehicleListItem = {
  id: string
  name: string
  status: VehicleStatus
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
}

type VehicleListProps = {
  vehicles: VehicleListItem[]
  onFocus?: (id: string) => void
}

const statusColors: Record<VehicleStatus, string> = {
  moving: '#2563eb',
  parked: '#f59e0b',
  inactive: '#6b7280',
}

export default function VehicleList({ vehicles, onFocus }: VehicleListProps) {
  const [open, setOpen] = useState<boolean>(true)

  return (
    <aside className="h-full flex flex-col">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between rounded-md border border-gray-300 dark:border-neutral-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-neutral-900 shadow-sm"
      >
        <span className="inline-flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            className="text-blue-600"
          >
            <path
              fill="currentColor"
              d="M5 16h14l1-5H4l1 5m0 2a2 2 0 0 1-2-2l-1-9h20l-1 9a2 2 0 0 1-2 2H5M6 6V4h2v2h8V4h2v2h2a1 1 0 0 1 1 1v1H3V7a1 1 0 0 1 1-1h2Z"
            />
          </svg>
          Vehicles ({vehicles.length})
        </span>
        <span className="text-xs text-gray-500">{open ? 'Hide' : 'Show'}</span>
      </button>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-600 dark:text-neutral-400 flex-wrap">
        {(['moving', 'parked', 'inactive'] as VehicleStatus[]).map(status => (
          <span key={status} className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full border border-white dark:border-neutral-900"
              style={{ backgroundColor: statusColors[status] }}
            />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        ))}
      </div>

      {open && (
        <ul className="mt-3 space-y-2 overflow-auto">
          {vehicles.map(v => (
            <li
              key={v.id}
              className="rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-white dark:border-neutral-900"
                    style={{ backgroundColor: statusColors[v.status] }}
                    title={`Status: ${v.status}`}
                  />
                  <p className="font-medium text-gray-900 dark:text-white">
                    {v.name}
                  </p>
                  {v.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.color) && (
                    <span
                      className="ml-1 inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-neutral-800 px-1.5 py-0.5 text-[11px] text-gray-600 dark:text-neutral-400"
                      title="Vehicle color"
                    >
                      <span
                        className="h-2 w-2 rounded-full border border-white dark:border-neutral-900"
                        style={{ backgroundColor: v.color }}
                      />
                      Color
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onFocus?.(v.id)}
                  className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  Focus
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-neutral-400">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {v.vehicleNumber && <span>No: {v.vehicleNumber}</span>}
                  {v.vehicleType && <span>Type: {v.vehicleType}</span>}
                </div>
                <p>
                  Status:{' '}
                  <span className="capitalize">
                    {v.status.replace('-', ' ')}
                  </span>{' '}
                  • Route: {v.routeLabel ?? '—'}
                </p>
                {typeof v.lat === 'number' && typeof v.lng === 'number' ? (
                  <p>
                    Pos: {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
                  </p>
                ) : (
                  <p>Pos: —</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {v.speedKmh != null && (
                    <span>Speed: {v.speedKmh.toFixed(1)} km/h</span>
                  )}
                  {v.etaNextMinutes != null && (
                    <span>ETA next: {v.etaNextMinutes.toFixed(1)} min</span>
                  )}
                  {v.lastUpdated && (
                    <span>Last: {new Date(v.lastUpdated).toLocaleTimeString()}</span>
                  )}
                </div>
                {typeof v.progressPercent === 'number' && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${Math.max(0, Math.min(100, v.progressPercent))}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500 dark:text-neutral-500">
                      Route progress: {Math.round(v.progressPercent)}%
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
