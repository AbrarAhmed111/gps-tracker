import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-12 bg-gradient-to-b from-gray-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <div className="hidden lg:block lg:col-span-2 border-r border-gray-200 dark:border-neutral-800">
        <div className="sticky top-0 h-screen">
          <div className="px-3 py-4 text-xs text-gray-500 dark:text-neutral-400">
            Navigation
          </div>
          <AdminSidebar />
        </div>
      </div>
      <div className="col-span-12 lg:col-span-10 flex flex-col">
        <AdminHeader />
        <main className="flex-1 p-4">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
