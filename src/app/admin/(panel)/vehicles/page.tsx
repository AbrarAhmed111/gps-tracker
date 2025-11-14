'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

type Vehicle = {
  id: string
  name: string
  vehicle_number: string | null
  vehicle_type: string | null
  color: string | null
  is_active: boolean | null
  created_at: string | null
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [showModal, setShowModal] = useState<boolean>(false)
  const [name, setName] = useState<string>('')
  const [number, setNumber] = useState<string>('')
  const [type, setType] = useState<string>('')
  const [color, setColor] = useState<string>('#000000')
  const [active, setActive] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return vehicles
    const q = search.toLowerCase()
    return vehicles.filter(
      v =>
        v.name.toLowerCase().includes(q) ||
        (v.vehicle_number ?? '').toLowerCase().includes(q) ||
        (v.vehicle_type ?? '').toLowerCase().includes(q),
    )
  }, [vehicles, search])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('vehicles')
        .select(
          'id, name, vehicle_number, vehicle_type, color, is_active, created_at',
        )
        .order('created_at', { ascending: false })
      if (!active) return
      if (error) {
        toast.error('Failed to load vehicles')
      } else {
        setVehicles((data as any) ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  async function addVehicle() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      setSaving(true)
      const supabase = createClient()
      const { data: userRes } = await supabase.auth.getUser()
      const { error } = await supabase.from('vehicles').insert([
        {
          name: name.trim(),
          vehicle_number: number || null,
          vehicle_type: type || null,
          color: color || '#000000',
          is_active: active,
          created_by: userRes.user?.id ?? null,
        },
      ])
      if (error) throw error
      toast.success('Vehicle added')
      // refresh
      const { data } = await supabase
        .from('vehicles')
        .select(
          'id, name, vehicle_number, vehicle_type, color, is_active, created_at',
        )
        .order('created_at', { ascending: false })
      setVehicles((data as any) ?? [])
      setShowModal(false)
      setName('')
      setNumber('')
      setType('')
      setColor('#000000')
      setActive(true)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add vehicle')
    } finally {
      setSaving(false)
    }
  }

  async function deleteVehicle(id: string) {
    if (!confirm('Delete this vehicle and its routes?')) return
    try {
      setDeletingId(id)
      const supabase = createClient()
      const { error } = await supabase.from('vehicles').delete().eq('id', id)
      if (error) throw error
      toast.success('Vehicle deleted')
      setVehicles(vs => vs.filter(v => v.id !== id))
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete vehicle')
    } finally {
      setDeletingId(null)
    }
  }

  async function toggleActive(id: string, current: boolean | null) {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('vehicles')
        .update({ is_active: !current })
        .eq('id', id)
      if (error) throw error
      setVehicles(vs =>
        vs.map(v => (v.id === id ? { ...v, is_active: !current } : v)),
      )
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Vehicles
        </h2>
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
            Add Vehicle
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-neutral-900/60 text-gray-600 dark:text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Number</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Color</th>
              <th className="text-left px-4 py-2 font-medium">Active</th>
              <th className="text-left px-4 py-2 font-medium">Created</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-gray-500 dark:text-neutral-400"
                >
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-gray-500 dark:text-neutral-400"
                >
                  No vehicles
                </td>
              </tr>
            ) : (
              filtered.map(v => (
                <tr
                  key={v.id}
                  className="border-t border-gray-100 dark:border-neutral-800"
                >
                  <td className="px-4 py-2 text-gray-900 dark:text-white">
                    {v.name}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {v.vehicle_number ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {v.vehicle_type ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-gray-300 align-middle dark:border-neutral-700"
                      style={{ backgroundColor: v.color ?? '#000000' }}
                      title={v.color ?? '#000000'}
                    />
                    <span className="ml-2 align-middle">{v.color ?? '—'}</span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleActive(v.id, v.is_active ?? false)}
                      className={`text-xs px-2 py-0.5 rounded-full ${v.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300'}`}
                    >
                      {v.is_active ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-neutral-400">
                    {v.created_at
                      ? new Date(v.created_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => deleteVehicle(v.id)}
                      disabled={deletingId === v.id}
                      className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/20 disabled:opacity-60"
                    >
                      {deletingId === v.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Add vehicle
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Truck 101"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
                    Number
                  </label>
                  <input
                    type="text"
                    value={number}
                    onChange={e => setNumber(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="ABC-1234"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Truck / Van / Car"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
                  Color
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="ml-2 h-8 w-16 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Active
                </label>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  onClick={addVehicle}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white shadow-sm"
                >
                  {saving ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
