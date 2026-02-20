'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

type LoginLog = {
  id: string
  ip_address: string
  login_time: string | null
  success: boolean
  user_agent: string | null
}

export default function PublicUsersPage() {
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [password, setPassword] = useState<string>('')
  const [confirm, setConfirm] = useState<string>('')
  const [show, setShow] = useState<boolean>(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [search, setSearch] = useState<string>('')

  const filtered = useMemo(() => {
    if (!search) return logs
    const q = search.toLowerCase()
    return logs.filter(
      l =>
        l.ip_address?.toString().toLowerCase().includes(q) ||
        l.user_agent?.toLowerCase().includes(q),
    )
  }, [logs, search])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const supabase = createClient()
      // Load latest logs
      const { data, error } = await supabase
        .from('public_login_logs')
        .select('*')
        .order('login_time', { ascending: false })
        .limit(200)
      if (!active) return
      if (error) {
        toast.error('Failed to load public logs')
      } else {
        setLogs((data as any) ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  async function updatePassword() {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    try {
      setSaving(true)
      const res = await fetch('/api/admin/public-users/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || 'Failed to update password')
      setPassword('')
      setConfirm('')
      setUpdatedAt(json?.updatedAt ?? new Date().toISOString())
      toast.success('Public password updated')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Public Users
        </h2>
        <p className="text-xs text-gray-600 dark:text-neutral-400">
          Manage shared public access password and view public login attempts.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Change Public Password
        </h3>
        <p className="text-xs text-gray-600 dark:text-neutral-400">
          This affects the password users enter for public dashboard access.
        </p>
        <div className="mt-2">
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/admin/public-users/force-logout', { method: 'POST' })
                if (!res.ok) {
                  const j = await res.json().catch(() => ({} as any))
                  throw new Error(j?.error || 'Failed to sign out all')
                }
                toast.success('All public users signed out')
              } catch (e: any) {
                toast.error(e?.message || 'Failed to sign out all')
              }
            }}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
            title="Force sign out all public sessions"
          >
            Sign out all public users
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
              New password
            </label>
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="New public password"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
              Confirm password
            </label>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Confirm password"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setShow(s => !s)}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            {show ? 'Hide' : 'Reveal'}
          </button>
          <div className="text-xs text-gray-500 dark:text-neutral-400">
            {updatedAt
              ? `Last updated: ${new Date(updatedAt).toLocaleString()}`
              : '—'}
          </div>
          <button
            onClick={updatePassword}
            disabled={saving}
            className="ml-auto px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm shadow-sm"
          >
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Public Login Logs
            </h3>
            <p className="text-xs text-gray-600 dark:text-neutral-400">
              Latest 200 attempts shown. Search by IP or user agent.
            </p>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search IP or UA…"
            className="w-56 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-neutral-900/60 text-gray-600 dark:text-neutral-400">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Time</th>
                <th className="text-left px-3 py-2 font-medium">IP</th>
                <th className="text-left px-3 py-2 font-medium">Success</th>
                <th className="text-left px-3 py-2 font-medium">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-gray-500 dark:text-neutral-400"
                  >
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-gray-500 dark:text-neutral-400"
                  >
                    No records
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr
                    key={l.id}
                    className="border-t border-gray-100 dark:border-neutral-800"
                  >
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                      {l.login_time
                        ? new Date(l.login_time).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">
                      {l.ip_address}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          l.success
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {l.success ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-neutral-400">
                      <span className="line-clamp-2">
                        {l.user_agent ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
