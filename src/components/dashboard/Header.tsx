'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import logo from '@/assets/img/trasnparent-logo.png'

type HeaderProps = {
  title?: string
  refreshMinutes?: number
  onManualRefresh?: () => void
}

export default function Header({
  title = 'GPS Simulation Dashboard',
  refreshMinutes = 10,
  onManualRefresh,
}: HeaderProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [now, setNow] = useState<Date>(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const secondsToNext = useMemo(() => {
    const diffMs = now.getTime() - lastUpdated.getTime()
    const total = refreshMinutes * 60
    const elapsed = Math.floor(diffMs / 1000)
    const remaining = Math.max(total - elapsed, 0)
    return remaining
  }, [now, lastUpdated, refreshMinutes])

  const progressPct = useMemo(() => {
    const total = refreshMinutes * 60
    if (total === 0) return 0
    const done = total - secondsToNext
    return Math.max(0, Math.min(100, Math.round((done / total) * 100)))
  }, [secondsToNext, refreshMinutes])

  useEffect(() => {
    if (secondsToNext === 0) {
      setLastUpdated(new Date())
      onManualRefresh?.()
    }
  }, [secondsToNext, onManualRefresh])

  function handleManualRefresh() {
    setLastUpdated(new Date())
    onManualRefresh?.()
  }

  return (
    <header className="relative w-full border-b border-gray-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-900/60">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={logo}
            width={36}
            height={36}
            alt="Logo"
            className="h-9 w-9 rounded-lg ring-1 ring-blue-500/30 shadow-sm object-contain"
            priority
          />
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  className="text-blue-600"
                >
                  <path
                    fill="currentColor"
                    d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2m1 10h5v2h-7V6h2Z"
                  />
                </svg>
                Auto-refresh in {Math.floor(secondsToNext / 60)}:
                {(secondsToNext % 60).toString().padStart(2, '0')}
              </span>
              <span className="hidden sm:inline text-gray-400">•</span>
              <span className="hidden sm:inline">Live simulation</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              className="text-white"
            >
              <path
                fill="currentColor"
                d="M12 6V3L8 7l4 4V8a4 4 0 0 1 4 4h2a6 6 0 0 0-6-6m-4 6a4 4 0 0 0 4 4v3l4-4l-4-4v3a2 2 0 0 1-2-2Z"
              />
            </svg>
            Refresh
          </button>
          <button
            onClick={async () => {
              try {
                await fetch('/api/public/logout', { method: 'POST' })
                window.location.reload()
              } catch {
                window.location.reload()
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 text-sm text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-neutral-800 shadow-sm"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gray-100 dark:bg-neutral-800">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </header>
  )
}
