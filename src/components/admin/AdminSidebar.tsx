'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiHome, FiMap, FiSettings, FiTruck, FiUsers } from 'react-icons/fi'

const nav = [
  { href: '/admin', label: 'Overview', icon: FiHome },
  { href: '/admin/vehicles', label: 'Vehicles', icon: FiTruck },
  { href: '/admin/routes', label: 'Routes', icon: FiMap },
  { href: '/admin/users', label: 'Users', icon: FiUsers },
  { href: '/admin/public-users', label: 'Public Users', icon: FiUsers },
  { href: '/admin/settings', label: 'Settings', icon: FiSettings },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="h-full w-full bg-white dark:bg-neutral-950 border-r border-gray-200 dark:border-neutral-800">
      <nav className="p-3 space-y-1">
        {nav.map(item => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition
              ${active ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-neutral-900'}`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
