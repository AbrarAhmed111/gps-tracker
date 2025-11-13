'use client'

import Link from 'next/link'

const rows = [
  {
    id: 'veh-1',
    name: 'Truck 101',
    status: 'Active',
    route: 'Mon Route v1',
    updated: '2m ago',
  },
  {
    id: 'veh-2',
    name: 'Van 202',
    status: 'Parked',
    route: 'Tue Route v2',
    updated: '12m ago',
  },
  {
    id: 'veh-3',
    name: 'Car 303',
    status: 'Inactive',
    route: '—',
    updated: '1d ago',
  },
]

export default function VehiclesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Vehicles
        </h2>
        <button className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm">
          Add Vehicle
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-neutral-900/60 text-gray-600 dark:text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Active Route</th>
              <th className="text-left px-4 py-2 font-medium">Updated</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr
                key={r.id}
                className="border-t border-gray-100 dark:border-neutral-800"
              >
                <td className="px-4 py-2 text-gray-900 dark:text-white">
                  {r.name}
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300">
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                  {r.route}
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-neutral-400">
                  {r.updated}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex gap-2">
                    <Link
                      href="#"
                      className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                    >
                      View
                    </Link>
                    <Link
                      href="#"
                      className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                    >
                      Edit
                    </Link>
                    <button className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/20">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
