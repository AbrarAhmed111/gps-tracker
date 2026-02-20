'use client'

import Image from 'next/image'
import logo from '@/assets/img/trasnparent-logo.png'
import { useRouter } from 'next/navigation'
import { clientSignout } from '@/lib/auth/signout'

type AdminHeaderProps = {
  title?: string
  subtitle?: string
  onToggleSidebar?: () => void
}

export default function AdminHeader({
  title = 'Admin Panel',
  subtitle = 'Manage vehicles, routes, and settings',
  onToggleSidebar,
}: AdminHeaderProps) {
  const router = useRouter()
  async function signOut() {
    // Best-effort: also clear any public access cookie so logging out is consistent.
    try {
      await fetch('/api/public/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    await clientSignout()
    router.replace('/admin/signin')
    router.refresh()
  }
  return (
    <header className="w-full border-b border-gray-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-900/60">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="inline-flex lg:hidden items-center justify-center h-9 w-9 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-neutral-900/80"
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z"
              />
            </svg>
          </button>
          <Image
            src={logo}
            width={32}
            height={32}
            alt="Logo"
            className="h-8 w-8 rounded-lg ring-1 ring-blue-500/30 shadow-sm object-contain"
            priority
          />
          <div>
            <h1 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-gray-600 dark:text-neutral-400">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={signOut}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
