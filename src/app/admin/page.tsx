'use client'

import { FiActivity, FiMap, FiTruck, FiUpload } from 'react-icons/fi'

export default function AdminDashboardPage() {
  const cards = [
    {
      label: 'Total Vehicles',
      value: 12,
      icon: FiTruck,
      color: 'text-blue-600',
    },
    {
      label: 'Active Routes',
      value: 8,
      icon: FiMap,
      color: 'text-emerald-600',
    },
    {
      label: 'Uploads This Week',
      value: 5,
      icon: FiUpload,
      color: 'text-amber-600',
    },
    {
      label: 'System Status',
      value: 'Healthy',
      icon: FiActivity,
      color: 'text-violet-600',
    },
  ]
  const activity = [
    { time: '10:20', text: 'Uploaded route for Delivery Truck 01' },
    { time: '09:05', text: 'Activated weekday schedule for Service Van 02' },
    { time: 'Yesterday', text: 'Added new vehicle: Car 303' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    {c.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    {c.value}
                  </p>
                </div>
                <div
                  className={`h-10 w-10 rounded-lg bg-gray-50 dark:bg-neutral-800 grid place-items-center ${c.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
          Recent activity
        </h2>
        <ul className="mt-3 space-y-2">
          {activity.map((a, idx) => (
            <li key={idx} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-200">{a.text}</span>
              <span className="text-xs text-gray-500 dark:text-neutral-400">
                {a.time}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
