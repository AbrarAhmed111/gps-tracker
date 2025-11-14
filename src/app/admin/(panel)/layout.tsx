 'use client'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import type { ReactNode } from 'react'
import { useState } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen grid grid-cols-12 bg-gradient-to-b from-gray-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      {/* Desktop sidebar */}
      <div className="hidden lg:block lg:col-span-2 border-r border-gray-200 dark:border-neutral-800">
        <div className="sticky top-0 h-screen">
          <div className="px-3 py-4 text-xs text-gray-500 dark:text-neutral-400">Navigation</div>
          <AdminSidebar />
        </div>
      </div>
      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-neutral-950 border-r border-gray-200 dark:border-neutral-800 shadow-lg lg:hidden">
            <div className="px-3 py-3 flex items-center justify-between border-b border-gray-200 dark:border-neutral-800">
              <span className="text-xs text-gray-500 dark:text-neutral-400">Navigation</span>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-neutral-700 text-white"
                aria-label="Close navigation"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <AdminSidebar />
          </div>
        </>
      )}
      <div className="col-span-12 lg:col-span-10 flex flex-col">
        <AdminHeader onToggleSidebar={() => setOpen(true)} />
        <main className="flex-1 p-4">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
