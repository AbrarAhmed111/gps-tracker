'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { axiosInstance } from '@/utils/axios'

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
  file_name?: string | null
  file_checksum?: string | null
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
  const [editingRoute, setEditingRoute] = useState<RouteRow | null>(null)
  const [file, setFile] = useState<File | null>(null)
  function openCreateModal() {
    setEditingRoute(null)
    setVehicleId('')
    setRouteName('')
    setFile(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingRoute(null)
    setVehicleId('')
    setRouteName('')
    setFile(null)
  }

  function openEditRoute(route: RouteRow) {
    setEditingRoute(route)
    setVehicleId(route.vehicle_id)
    setRouteName(route.route_name)
    setFile(null)
    setShowModal(true)
  }

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
            'id, route_name, vehicle_id, total_waypoints, is_active, monday, tuesday, wednesday, thursday, friday, saturday, sunday, created_at, file_name, file_checksum',
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

  async function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const res = reader.result as string
        const base64 = res.split(',')[1] || ''
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
  }

  function dayFlagsFromNumbers(nums: number[]) {
    const has = (n: number) => nums.includes(n)
    // Backend schemas use Monday=0..Sunday=6
    return {
      monday: has(0),
      tuesday: has(1),
      wednesday: has(2),
      thursday: has(3),
      friday: has(4),
      saturday: has(5),
      sunday: has(6),
    }
  }

  const ANCHOR_WEEK_START_MS = Date.UTC(2024, 0, 1) // Monday 2024-01-01 (anchor week)

  function anchorTimestampToWeek(ts: string | null, dayOfWeek: number) {
    const safeDay = Number.isFinite(dayOfWeek) ? Math.max(0, Math.min(6, Number(dayOfWeek))) : 0
    if (ts) {
      const parsed = new Date(ts)
      if (!Number.isNaN(parsed.getTime())) {
        const anchoredMs = Date.UTC(
          2024,
          0,
          1 + safeDay,
          parsed.getHours(),
          parsed.getMinutes(),
          parsed.getSeconds(),
          parsed.getMilliseconds(),
        )
        return new Date(anchoredMs).toISOString()
      }
    }
    const base = new Date(ANCHOR_WEEK_START_MS + safeDay * 24 * 60 * 60 * 1000)
    return base.toISOString()
  }

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

      if (editingRoute && !file) {
        toast.error('Upload the latest Excel file to update this route.')
        setSaving(false)
        return
      }

      if (!editingRoute || editingRoute.vehicle_id !== vehicleId) {
        const existingRoute = await supabase
          .from('routes')
          .select('id, vehicle_id')
          .eq('vehicle_id', vehicleId)
          .maybeSingle()
        if (existingRoute.data && existingRoute.data.id !== editingRoute?.id) {
          toast.error('This vehicle already has a route. Deactivate or delete it before creating another.')
          setSaving(false)
          return
        }
      }

      let fileName = editingRoute?.file_name || 'manual'
      let checksum = editingRoute?.file_checksum || `manual-${crypto.randomUUID()}`
      let totalWaypoints = 0
      let parsedWaypoints:
        | Array<{
            sequence_number: number
            latitude: number | null
            longitude: number | null
            timestamp: string | null
            day_of_week: number
            is_parking?: boolean
            original_address?: string | null
          }>
        | null = null
      let activeDayFlags = editingRoute
        ? {
            monday: !!editingRoute.monday,
            tuesday: !!editingRoute.tuesday,
            wednesday: !!editingRoute.wednesday,
            thursday: !!editingRoute.thursday,
            friday: !!editingRoute.friday,
            saturday: !!editingRoute.saturday,
            sunday: !!editingRoute.sunday,
          }
        : dayFlagsFromNumbers([])

      if (file) {
        fileName = file.name
        const fileContentB64 = await fileToBase64(file)
        if (!axiosInstance.defaults.baseURL) {
          throw new Error('Backend base URL not configured. Set NEXT_PUBLIC_BACKEND_BASE_URL.')
        }
        const resp = await axiosInstance.post('/api/v1/excel/process', {
          file_content: fileContentB64,
          file_name: fileName,
          options: null,
        })
        const payload = resp.data?.data
        if (!payload) throw new Error('Invalid response from backend')
        checksum = payload.file_info?.file_checksum || checksum
        const daysFound: number[] = (payload.route_summary?.days_found ?? []) as number[]
        activeDayFlags = dayFlagsFromNumbers(daysFound)
        const byDay = payload.waypoints_by_day || {}
        const items: Array<{
          sequence_number: number
          latitude: number | null
          longitude: number | null
          timestamp: string | null
          day_of_week: number
          is_parking?: boolean
          original_address?: string | null
        }> = []
        Object.keys(byDay).forEach(k => {
          const dNum = Number(k)
          const arr = byDay[k] as any[]
          for (const w of arr) {
            items.push({
              sequence_number: Number(w.sequence) || items.length + 1,
              latitude: w.latitude ?? null,
              longitude: w.longitude ?? null,
              timestamp: w.timestamp || null,
              day_of_week: Number.isFinite(dNum) ? dNum : 0,
              is_parking: Boolean(w.is_parking),
              original_address: w.original_address || null,
            })
          }
        })
        
        // Geocode addresses that need geocoding
        const addressesToGeocode = payload.addresses_to_geocode || []
        if (addressesToGeocode.length > 0) {
          // Get Google Maps API key from settings
          const { data: settingsData } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'google_maps_api_key')
            .maybeSingle()
          const apiKey = settingsData?.setting_value
          
          if (!apiKey) {
            throw new Error('Google Maps API key is required for geocoding addresses. Please set it in Settings.')
          }
          
          // Prepare batch geocoding request with both sequence-based and address-based IDs
          const geocodeItems = addressesToGeocode.map((addr: any) => ({
            id: `seq_${addr.sequence}_day_${addr.day_of_week}_addr_${addr.address.substring(0, 50)}`,
            address: addr.address,
            cache_key: addr.cache_key,
          }))
          
          // Call batch geocoding API
          const geocodeResp = await axiosInstance.post('/api/v1/geocoding/batch', {
            addresses: geocodeItems,
            api_key: apiKey,
          })
          
          const geocodeResults = geocodeResp.data?.data?.results || []
          const geocodeMapByKey = new Map<string, { lat: number; lng: number }>()
          const geocodeMapByAddress = new Map<string, { lat: number; lng: number }>()
          
          for (let i = 0; i < geocodeResults.length; i++) {
            const result = geocodeResults[i]
            const addrItem = addressesToGeocode[i]
            if (result.success && result.latitude && result.longitude) {
              const coords = { lat: result.latitude, lng: result.longitude }
              geocodeMapByKey.set(result.id, coords)
              // Also index by address for fallback matching
              if (addrItem?.address) {
                geocodeMapByAddress.set(addrItem.address.trim().toLowerCase(), coords)
              }
            }
          }
          
          // Track failed geocoding attempts
          const failedAddresses: Array<{ sequence: number; address: string; error?: string }> = []
          
          // Collect failed geocoding results first
          for (const result of geocodeResults) {
            if (!result.success && result.address) {
              // Extract sequence from ID or find matching address
              const addrItem = addressesToGeocode.find((a: any) => a.address === result.address)
              if (addrItem) {
                failedAddresses.push({
                  sequence: addrItem.sequence,
                  address: result.address,
                  error: result.error || 'Geocoding failed',
                })
              }
            }
          }
          
          // Update items with geocoded coordinates
          for (const item of items) {
            if (!item.latitude || !item.longitude) {
              // Try matching by sequence and day first
              const key = `seq_${item.sequence_number}_day_${item.day_of_week}_addr_${(item.original_address || '').substring(0, 50)}`
              let coords = geocodeMapByKey.get(key)
              
              // Fallback: match by address
              if (!coords && item.original_address) {
                coords = geocodeMapByAddress.get(item.original_address.trim().toLowerCase())
              }
              
              if (coords) {
                item.latitude = coords.lat
                item.longitude = coords.lng
              } else if (item.original_address && !failedAddresses.find(f => f.address === item.original_address)) {
                // Only add if not already in failed list
                failedAddresses.push({
                  sequence: item.sequence_number,
                  address: item.original_address,
                  error: 'No geocoding result found',
                })
              }
            }
          }
          
          // Show warning if some addresses failed (but don't block if some succeeded)
          if (failedAddresses.length > 0 && failedAddresses.length < addressesToGeocode.length) {
            const failedList = failedAddresses
              .slice(0, 5) // Show first 5 failures
              .map(f => `• Sequence ${f.sequence}: "${f.address.substring(0, 40)}${f.address.length > 40 ? '...' : ''}" - ${f.error || 'Failed'}`)
              .join('\n')
            const moreText = failedAddresses.length > 5 ? `\n... and ${failedAddresses.length - 5} more` : ''
            toast.error(
              `${failedAddresses.length} of ${addressesToGeocode.length} address(es) could not be geocoded:\n${failedList}${moreText}`,
              { duration: 12000 }
            )
          }
        }
        
        totalWaypoints = items.length
        parsedWaypoints = items
      }

      // Check if any waypoints still lack coordinates after geocoding
      const waypointsWithoutCoords = (parsedWaypoints ?? []).filter(
        w => !w.latitude || !w.longitude || !Number.isFinite(w.latitude) || !Number.isFinite(w.longitude)
      )
      
      if (waypointsWithoutCoords.length > 0) {
        const missingDetails = waypointsWithoutCoords
          .map((w, idx) => {
            const seq = w.sequence_number || idx + 1
            const addr = w.original_address || 'No address provided'
            return `Sequence ${seq}: "${addr}"`
          })
          .join('\n')
        
        throw new Error(
          `${waypointsWithoutCoords.length} waypoint(s) are missing coordinates:\n${missingDetails}\n\n` +
          'Please:\n' +
          '1. Check that the addresses are valid and complete\n' +
          '2. Ensure your Google Maps API key has Geocoding API enabled\n' +
          '3. Or provide latitude/longitude coordinates directly in the Excel file'
        )
      }
      
      const validWaypoints = parsedWaypoints ?? []
      totalWaypoints = validWaypoints.length

      const baseRoute = {
        vehicle_id: vehicleId,
        route_name: routeName.trim(),
        file_name: fileName,
        file_checksum: checksum,
        total_waypoints: totalWaypoints,
        is_active: true,
        monday: activeDayFlags.monday,
        tuesday: activeDayFlags.tuesday,
        wednesday: activeDayFlags.wednesday,
        thursday: activeDayFlags.thursday,
        friday: activeDayFlags.friday,
        saturday: activeDayFlags.saturday,
        sunday: activeDayFlags.sunday,
      }

      let routeId = editingRoute?.id
      if (editingRoute) {
        const { error: updateErr } = await supabase.from('routes').update(baseRoute).eq('id', editingRoute.id)
        if (updateErr) throw updateErr
        const { error: deleteErr } = await supabase.from('waypoints').delete().eq('route_id', editingRoute.id)
        if (deleteErr) throw deleteErr
      } else {
      const { data: routeIns, error: rErr } = await supabase
        .from('routes')
          .insert([baseRoute])
        .select('id')
        .maybeSingle()
      if (rErr) throw rErr
        routeId = routeIns?.id as string
      }

      if (!routeId) throw new Error('Route ID missing after save')

      if (validWaypoints && validWaypoints.length > 0) {
        const batches = []
        for (let i = 0; i < validWaypoints.length; i += 1000) {
          const chunk = validWaypoints.slice(i, i + 1000).map(wp => {
            // Ensure day_of_week is valid (0-6)
            const dayOfWeek = typeof wp.day_of_week === 'number' && wp.day_of_week >= 0 && wp.day_of_week <= 6 
              ? wp.day_of_week 
              : 0
            
            return {
              route_id: routeId,
              sequence_number: wp.sequence_number,
              latitude: wp.latitude ?? null,
              longitude: wp.longitude ?? null,
              // Anchor timestamps to a synthetic week so routes repeat weekly without real dates.
              timestamp: anchorTimestampToWeek(wp.timestamp, dayOfWeek),
              day_of_week: dayOfWeek,
              original_address: wp.original_address || null,
              is_parking: wp.is_parking || false,
            }
          })
          batches.push(supabase.from('waypoints').insert(chunk))
        }
        for (const b of batches) {
          const { error } = await b
          if (error) {
            console.error('Waypoint insert error:', error)
            throw new Error(`Failed to save waypoints: ${error.message}`)
          }
        }
      } else {
        throw new Error('No valid waypoints to save. Please check your Excel file has valid coordinates or addresses.')
      }

      // Show success message with details
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const activeDays = Object.entries(activeDayFlags)
        .filter(([_, active]) => active)
        .map(([day, _]) => day.charAt(0).toUpperCase() + day.slice(1))
      
      // Check if route is active for today
      const today = new Date()
      const jsDay = today.getDay() // 0=Sunday, 6=Saturday
      const mondayZeroDay = (jsDay + 6) % 7 // Convert to Monday=0 format
      const todayName = dayNames[mondayZeroDay]
      const isActiveToday = 
        (mondayZeroDay === 0 && activeDayFlags.monday) ||
        (mondayZeroDay === 1 && activeDayFlags.tuesday) ||
        (mondayZeroDay === 2 && activeDayFlags.wednesday) ||
        (mondayZeroDay === 3 && activeDayFlags.thursday) ||
        (mondayZeroDay === 4 && activeDayFlags.friday) ||
        (mondayZeroDay === 5 && activeDayFlags.saturday) ||
        (mondayZeroDay === 6 && activeDayFlags.sunday)
      
      const successMsg = editingRoute 
        ? `Route updated! ${totalWaypoints} waypoints saved. Active days: ${activeDays.length > 0 ? activeDays.join(', ') : 'None'}`
        : `Route created! ${totalWaypoints} waypoints saved. Active days: ${activeDays.length > 0 ? activeDays.join(', ') : 'None'}`
      
      toast.success(successMsg, { duration: 5000 })
      
      // Show warning if route is not active for today
      if (!isActiveToday && activeDays.length > 0) {
        setTimeout(() => {
          toast.error(
            `Note: This route is not active for today (${todayName}). It will appear on: ${activeDays.join(', ')}`,
            { duration: 8000 }
          )
        }, 1500)
      } else if (activeDays.length === 0) {
        setTimeout(() => {
          toast.error(
            'Warning: No active days detected from Excel file. Route will not appear on the dashboard. Please check your day_of_week column.',
            { duration: 8000 }
          )
        }, 1500)
      }
      
      // Verify route was saved correctly
      const { data: verifyRoute } = await supabase
        .from('routes')
        .select('id, is_active, monday, tuesday, wednesday, thursday, friday, saturday, sunday')
        .eq('id', routeId)
        .maybeSingle()
      
      if (!verifyRoute) {
        toast.error('Route saved but verification failed. Please refresh the page.')
      } else if (!verifyRoute.is_active) {
        toast.error('Route was saved but is not active. Please activate it manually.', { duration: 6000 })
      }
      
      // Verify waypoints were saved
      const { count: waypointCount } = await supabase
        .from('waypoints')
        .select('*', { count: 'exact', head: true })
        .eq('route_id', routeId)
      
      if (waypointCount !== totalWaypoints) {
        toast.error(`Warning: Expected ${totalWaypoints} waypoints but found ${waypointCount}. Please check the route.`, { duration: 6000 })
      }

      const { data } = await supabase
        .from('routes')
        .select(
          'id, route_name, vehicle_id, total_waypoints, is_active, monday, tuesday, wednesday, thursday, friday, saturday, sunday, created_at, file_name, file_checksum',
        )
        .order('created_at', { ascending: false })
      setRoutes((data as any) ?? [])

      closeModal()
      
      // Show reminder to refresh dashboard
      if (!editingRoute) {
        setTimeout(() => {
          toast(
            (t) => (
              <div className="flex items-center gap-2">
                <span>Route is ready! Refresh the dashboard to see it.</span>
                <button
                  onClick={() => {
                    window.open('/', '_blank')
                    toast.dismiss(t.id)
                  }}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Open Dashboard
                </button>
              </div>
            ),
            { duration: 8000 }
          )
        }, 1000)
      }
    } catch (e: any) {
      toast.error(e?.message || (editingRoute ? 'Failed to update route' : 'Failed to create route'))
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
            onClick={openCreateModal}
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
                  onClick={() => openEditRoute(r)}
                  className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  Edit
                </button>
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
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {editingRoute ? 'Edit route' : 'Add / Upload Route'}
              </h3>
              <button
                onClick={closeModal}
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
                <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Waypoints Excel (.xlsx/.xls)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-gray-600 dark:text-neutral-400"
                  required={Boolean(editingRoute)}
                />
                <div className="mt-2 rounded-lg border border-dashed border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/40 p-3">
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-neutral-200">Excel requirements</p>
                  <ul className="mt-1 space-y-1 text-[11px] text-gray-600 dark:text-neutral-400 list-disc pl-4">
                    <li><span className="font-medium text-red-600 dark:text-red-400">timestamp</span> – <strong>Required</strong>. Time of day in <strong>UTC</strong> (e.g. <code>09:00</code> or <code>09:00:00</code>). If your times are local, convert to UTC before upload. Any date part is ignored; we anchor to a synthetic week for weekly replay.</li>
                    <li><span className="font-medium text-red-600 dark:text-red-400">day_of_week</span> – <strong>Required</strong>. Number 0 (Mon) → 6 (Sun); combines with time to build the weekly schedule</li>
                    <li><span className="font-medium text-red-600 dark:text-red-400">address</span> – <strong>Required</strong>. Will be geocoded to get coordinates if latitude/longitude are not provided</li>
                    <li><span className="font-medium">latitude</span> / <span className="font-medium">longitude</span> – <em>Optional</em>. Decimal degrees (-90..90 / -180..180). If missing, address will be geocoded</li>
                    <li><span className="font-medium">sequence</span> – <em>Optional</em>. Order per day (defaults to row order if missing)</li>
                    <li><span className="font-medium">is_parking</span> – <em>Optional</em>. Boolean (TRUE/FALSE or 1/0). Marks parking/stop locations</li>
                    <li><span className="font-medium">parking_duration_minutes</span> – <em>Optional</em>. Integer minutes. Duration to stay at parking location (only used if is_parking is TRUE)</li>
                    <li><span className="font-medium">notes</span> – <em>Optional</em>. Free text for additional information about the waypoint</li>
                  </ul>
                  <p className="mt-2 text-[11px] text-gray-500 dark:text-neutral-500">
                    Active days are read from the <code>day_of_week</code> column—no manual selection needed.
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-neutral-500">
                    Routes are anchored to a synthetic week (Mon=2024-01-01) so they can repeat every week without real calendar dates.
                  </p>
                  {editingRoute && (
                    <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-300">
                      Re-upload the updated Excel file to replace the current waypoints.
                    </p>
                  )}
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={closeModal}
                  className="text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white shadow-sm"
                >
                  {saving ? 'Saving…' : editingRoute ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
