'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

type Vehicle = { id: string; name: string }
type RouteRow = {
  id: string
  route_name: string
  vehicle_id: string
  total_waypoints: number
  is_active: boolean | null
  monday: boolean | null
  tuesday: boolean | null
  wednesday: boolean | null
  thursday: boolean | null
  friday: boolean | null
  saturday: boolean | null
  sunday: boolean | null
  created_at: string | null
}

const DAYS: Array<{ key: keyof RouteRow; label: string }> = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
]

export default function RoutesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [routes, setRoutes] = useState<RouteRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [showModal, setShowModal] = useState<boolean>(false)
  const [vehicleId, setVehicleId] = useState<string>('')
  const [routeName, setRouteName] = useState<string>('')
  const [days, setDays] = useState<Record<string, boolean>>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  })
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [saving, setSaving] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return routes.filter(
      r =>
        r.route_name.toLowerCase().includes(q) ||
        vehicles.find(v => v.id === r.vehicle_id)?.name.toLowerCase().includes(q),
    )
  }, [routes, vehicles, search])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const [{ data: vData }, { data: rData, error: rErr }] = await Promise.all([
        supabase.from('vehicles').select('id, name').order('name', { ascending: true }),
        supabase
          .from('routes')
          .select(
            'id, route_name, vehicle_id, total_waypoints, is_active, monday, tuesday, wednesday, thursday, friday, saturday, sunday, created_at',
          )
          .order('created_at', { ascending: false }),
      ])
      if (!active) return
      setVehicles((vData as any) ?? [])
      if (rErr) {
        toast.error('Failed to load routes')
      } else {
        setRoutes((rData as any) ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  async function handleCreate() {
    if (!vehicleId) {
      toast.error('Select a vehicle')
      return
    }
    if (!routeName.trim()) {
      toast.error('Route name is required')
      return
    }
    try {
      setSaving(true)
      const supabase = createClient()
      // Compute checksum if file provided
      let checksum = `manual-${crypto.randomUUID()}`
      let fileName = 'manual'
      let waypoints: Array<{
        sequence_number: number
        latitude: number
        longitude: number
        timestamp?: string
        day_of_week?: number
      }> = []
      if (csvFile) {
        fileName = csvFile.name
        const buf = await csvFile.arrayBuffer()
        const digest = await crypto.subtle.digest('SHA-256', buf)
        checksum = Array.from(new Uint8Array(digest))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        // naive CSV parsing: header: latitude,longitude[,timestamp][,day_of_week]
        const text = new TextDecoder().decode(buf)
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        let start = 0
        // detect header by non-numeric
        if (lines.length > 0 && /[a-zA-Z]/.test(lines[0])) start = 1
        let seq = 1
        for (let i = start; i < lines.length; i++) {
          const cols = lines[i].split(',').map(s => s.trim())
          const lat = Number(cols[0])
          const lng = Number(cols[1])
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
          const timestamp = cols[2] && cols[2].length > 0 ? cols[2] : undefined
          const dow = cols[3] != null && cols[3] !== '' ? Number(cols[3]) : undefined
          waypoints.push({
            sequence_number: seq++,
            latitude: lat,
            longitude: lng,
            timestamp,
            day_of_week: Number.isFinite(dow as any) ? (dow as number) : undefined,
          })
        }
      }
      const insertRoute = {
        vehicle_id: vehicleId,
        route_name: routeName.trim(),
        file_name: fileName,
        file_checksum: checksum,
        total_waypoints: waypoints.length,
        is_active: true,
        monday: days.monday,
        tuesday: days.tuesday,
        wednesday: days.wednesday,
        thursday: days.thursday,
        friday: days.friday,
        saturday: days.saturday,
        sunday: days.sunday,
      }
      const { data: routeIns, error: rErr } = await supabase
        .from('routes')
        .insert([insertRoute])
        .select('id')
        .maybeSingle()
      if (rErr) throw rErr
      const routeId = routeIns?.id as string
      if (csvFile && waypoints.length > 0) {
        // batch insert in chunks of 1k
        const batches = []
        for (let i = 0; i < waypoints.length; i += 1000) {
          const chunk = waypoints.slice(i, i + 1000).map(wp => ({
            route_id: routeId,
            sequence_number: wp.sequence_number,
            latitude: wp.latitude,
            longitude: wp.longitude,
            timestamp: wp.timestamp ? new Date(wp.timestamp).toISOString() : new Date().toISOString(),
            day_of_week:
              typeof wp.day_of_week === 'number'
                ? wp.day_of_week
                : new Date().getDay() === 0
                  ? 6
                  : new Date().getDay() - 1,
          }))
          batches.push(
            supabase.from('waypoints').insert(chunk),
          )
        }
        for (const b of batches) {
          const { error } = await b
          if (error) throw error
        }
      }
      toast.success('Route created')
      // refresh
      const { data } = await supabase
        .from('routes')
        .select(
          'id, route_name, vehicle_id, total_waypoints, is_active, monday, tuesday, wednesday, thursday, friday, saturday, sunday, created_at',
        )
        .order('created_at', { ascending: false })
      setRoutes((data as any) ?? [])
      // reset
      setShowModal(false)
      setVehicleId('')
      setRouteName('')
      setCsvFile(null)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create route')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(id: string, active: boolean | null) {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('routes')
        .update({ is_active: !active })
        .eq('id', id)
      if (error) throw error
      setRoutes(rs => rs.map(r => (r.id === id ? { ...r, is_active: !active } : r)))
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update')
    }
  }

  async function deleteRoute(id: string) {
    if (!confirm('Delete this route and its waypoints?')) return
    try {
      setDeletingId(id)
      const supabase = createClient()
      const { error } = await supabase.from('routes').delete().eq('id', id)
      if (error) throw error
      setRoutes(rs => rs.filter(r => r.id !== id))
      toast.success('Route deleted')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete route')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Routes</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="hidden sm:block w-56 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm"
          >
            Add / Upload
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(loading ? [] : filtered).map(r => {
          const vName = vehicles.find(v => v.id === r.vehicle_id)?.name ?? '—'
          const activeDays = DAYS.filter(d => r[d.key] ?? false).map(d => d.label)
          return (
            <div
              key={r.id}
              className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {r.route_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    {vName} • {r.total_waypoints} waypoints
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300'}`}
                >
                  {r.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-600 dark:text-neutral-400">Active days</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {DAYS.map(d => {
                    const active = Boolean(r[d.key])
                    return (
                      <span
                        key={d.label}
                        className={`px-2 py-0.5 rounded-md text-xs ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300'}`}
                      >
                        {d.label}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => toggleActive(r.id, r.is_active)}
                  className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  {r.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteRoute(r.id)}
                  disabled={deletingId === r.id}
                  className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/20 disabled:opacity-60"
                >
                  {deletingId === r.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )
        })}
        {(!loading && filtered.length === 0) && (
          <div className="text-sm text-gray-600 dark:text-neutral-400">No routes</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Add / Upload Route</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Vehicle</label>
                <select
                  value={vehicleId}
                  onChange={e => setVehicleId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select vehicle…</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Route name</label>
                <input
                  type="text"
                  value={routeName}
                  onChange={e => setRouteName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Weekday Route v1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Waypoints CSV (optional)</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-gray-600 dark:text-neutral-400"
                />
                <p className="mt-1 text-[11px] text-gray-500 dark:text-neutral-500">
                  Columns: latitude,longitude[,timestamp][,day_of_week]
                </p>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-neutral-400 mb-1">Active days</div>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <label key={d.label} className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                      <input
                        type="checkbox"
                        checked={Boolean(days[d.key])}
                        onChange={e => setDays(prev => ({ ...prev, [d.key]: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white shadow-sm"
                >
                  {saving ? 'Saving…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
