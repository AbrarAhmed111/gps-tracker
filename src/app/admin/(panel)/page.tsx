'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiActivity, FiMap, FiTruck, FiUpload } from 'react-icons/fi'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

type RouteItem = { id: string; route_name: string; created_at: string | null }

export default function AdminDashboardPage() {
  const [totalVehicles, setTotalVehicles] = useState<number>(0)
  const [activeRoutes, setActiveRoutes] = useState<number>(0)
  const [uploadsWeek, setUploadsWeek] = useState<number>(0)
  const [mapsConfigured, setMapsConfigured] = useState<boolean>(false)
  const [recentRoutes, setRecentRoutes] = useState<RouteItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const supabase = createClient()
        // Vehicles count
        const { count: vCount, error: vErr } = await supabase
          .from('vehicles')
          .select('id', { count: 'exact', head: true })
        if (active) {
          if (!vErr && typeof vCount === 'number') setTotalVehicles(vCount)
        }
        // Active routes count
        const { count: rCount, error: rErr } = await supabase
          .from('routes')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
        if (active) {
          if (!rErr && typeof rCount === 'number') setActiveRoutes(rCount)
        }
        // Uploads this week
        const since = new Date()
        since.setDate(since.getDate() - 7)
        const { count: uCount } = await supabase
          .from('routes')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since.toISOString())
        if (active && typeof uCount === 'number') setUploadsWeek(uCount)
        // Settings
        const { data: settings } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['google_maps_api_key'])
        if (active) {
          const key = settings?.find(
            s => s.setting_key === 'google_maps_api_key',
          )?.setting_value
          setMapsConfigured(Boolean(key && key.trim().length > 0))
        }
        // Recent activity: latest 8 routes
        const { data: routes } = await supabase
          .from('routes')
          .select('id, route_name, created_at')
          .order('created_at', { ascending: false })
          .limit(8)
        if (active) {
          setRecentRoutes((routes as any) ?? [])
        }
      } catch {
        if (active) toast.error('Failed to load dashboard data')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const cards = useMemo(
    () => [
      {
        label: 'Total Vehicles',
        value: loading ? '—' : totalVehicles,
        icon: FiTruck,
        color: 'text-blue-600',
      },
      {
        label: 'Active Routes',
        value: loading ? '—' : activeRoutes,
        icon: FiMap,
        color: 'text-emerald-600',
      },
      {
        label: 'Uploads This Week',
        value: loading ? '—' : uploadsWeek,
        icon: FiUpload,
        color: 'text-amber-600',
      },
      {
        label: 'System Status',
        value: mapsConfigured ? 'Configured' : 'Missing Maps Key',
        icon: FiActivity,
        color: mapsConfigured ? 'text-violet-600' : 'text-red-600',
      },
    ],
    [totalVehicles, activeRoutes, uploadsWeek, mapsConfigured, loading],
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    {c.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    {c.value as any}
                  </p>
                </div>
                <div
                  className={`h-10 w-10 rounded-lg bg-gray-50 dark:bg-neutral-800 grid place-items-center ${c.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
          Recent activity
        </h2>
        <ul className="mt-3 space-y-2">
          {loading ? (
            <li className="text-sm text-gray-500 dark:text-neutral-400">
              Loading…
            </li>
          ) : recentRoutes.length === 0 ? (
            <li className="text-sm text-gray-500 dark:text-neutral-400">
              No recent uploads
            </li>
          ) : (
            recentRoutes.map(r => (
              <li
                key={r.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700 dark:text-gray-200">
                  {r.route_name}
                </span>
                <span className="text-xs text-gray-500 dark:text-neutral-400">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
