'use client'

import { useEffect, useState } from 'react'
import { ReactNode } from 'react'

type AccessGateProps = {
  children: ReactNode
}

export default function AccessGate({ children }: AccessGateProps) {
  const [granted, setGranted] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const res = await fetch('/api/public/session', { cache: 'no-store' })
        if (!mounted) return
        if (res.ok) {
          const json = await res.json()
          setGranted(Boolean(json?.granted))
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    check()
    return () => {
      mounted = false
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/public/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json().catch(() => ({}) as any)
      if (!res.ok || !json?.granted) {
        setError(json?.error || 'Incorrect password')
        return
      }
      setGranted(true)
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-gray-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="text-sm text-gray-600 dark:text-neutral-400">
          Loading…
        </div>
      </div>
    )
  }

  if (granted) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-gray-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm"
      >
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">
          Enter access password
        </h1>
        <p className="mt-1 text-xs text-gray-600 dark:text-neutral-400">
          Required to view the public dashboard.
        </p>
        <div className="mt-4">
          <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="********"
            required
          />
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="mt-4 w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 font-medium text-sm transition"
        >
          {submitting ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
