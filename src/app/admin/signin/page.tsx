'use client'

import Image from 'next/image'
import logo from '@/assets/img/trasnparent-logo.png'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function AdminSignInPage() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const router = useRouter()
  const params = useSearchParams()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        return
      }
      const returnUrl = params.get('returnUrl')
      router.replace(returnUrl ?? '/admin')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-gray-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Image
            src={logo}
            width={28}
            height={28}
            alt="Logo"
            className="h-7 w-7 rounded-lg ring-1 ring-blue-500/30 shadow-sm object-contain"
            priority
          />
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              Admin Sign in
            </h1>
            <p className="text-xs text-gray-600 dark:text-neutral-400">
              Secure access required
            </p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
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
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2 font-medium text-sm transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="flex items-center justify-between text-xs">
            <Link href="#" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
            <Link
              href="/admin"
              className="text-gray-600 dark:text-neutral-400 hover:underline"
            >
              Continue as guest
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
