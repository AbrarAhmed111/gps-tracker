'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

type AdminProfile = {
  id: string
  username: string
  full_name: string | null
  is_active: boolean | null
  last_login: string | null
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showModal, setShowModal] = useState<boolean>(false)
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [fullName, setFullName] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [active, setActive] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [search, setSearch] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return profiles
    const q = search.toLowerCase()
    return profiles.filter(
      p =>
        p.username.toLowerCase().includes(q) ||
        (p.full_name ?? '').toLowerCase().includes(q),
    )
  }, [profiles, search])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data: userRes } = await supabase.auth.getUser()
      if (active) setSelfId(userRes.user?.id ?? null)
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('id, username, full_name, is_active, last_login')
        .order('username', { ascending: true })
      if (!active) return
      if (error) {
        toast.error('Failed to load users')
      } else {
        setProfiles((data as any) ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  async function addUser() {
    if (!email || !password) {
      toast.error('Email and password are required')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          username,
          is_active: active,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to create user')
      toast.success('User created')
      // Refresh list
      const supabase = createClient()
      const { data } = await supabase
        .from('admin_profiles')
        .select('id, username, full_name, is_active, last_login')
        .order('username', { ascending: true })
      setProfiles((data as any) ?? [])
      // Reset and close
      setEmail('')
      setPassword('')
      setFullName('')
      setUsername('')
      setActive(true)
      setShowModal(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser(id: string) {
    if (id === selfId) {
      toast.error("You can't delete your own account")
      return
    }
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      setDeletingId(id)
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}) as any)
        throw new Error(json?.error || 'Failed to delete user')
      }
      toast.success('User deleted')
      const supabase = createClient()
      const { data } = await supabase
        .from('admin_profiles')
        .select('id, username, full_name, is_active, last_login')
        .order('username', { ascending: true })
      setProfiles((data as any) ?? [])
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Users
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
            Add User
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-neutral-900/60 text-gray-600 dark:text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Username</th>
              <th className="text-left px-4 py-2 font-medium">Full name</th>
              <th className="text-left px-4 py-2 font-medium">Active</th>
              <th className="text-left px-4 py-2 font-medium">Last login</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-gray-500 dark:text-neutral-400"
                >
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-gray-500 dark:text-neutral-400"
                >
                  No users
                </td>
              </tr>
            ) : (
              filtered.map(u => (
                <tr
                  key={u.id}
                  className="border-t border-gray-100 dark:border-neutral-800"
                >
                  <td className="px-4 py-2 text-gray-900 dark:text-white">
                    {u.username}
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                    {u.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${u.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300'}`}
                    >
                      {u.is_active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-neutral-400">
                    {u.last_login
                      ? new Date(u.last_login).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => deleteUser(u.id)}
                      disabled={deletingId === u.id}
                      className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/20 disabled:opacity-60"
                    >
                      {deletingId === u.id ? 'Deleting…' : 'Delete'}
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
                Add user
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
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="********"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="admin"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="h-4 w-4"
                />
                Active
              </label>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  onClick={addUser}
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
