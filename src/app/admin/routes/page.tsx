'use client'

export default function RoutesPage() {
  const routes = [
    {
      name: 'Mon Route v1',
      waypoints: 124,
      activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      status: 'Active',
    },
    {
      name: 'Tue Route v2',
      waypoints: 98,
      activeDays: ['Tue', 'Thu'],
      status: 'Active',
    },
    {
      name: 'Legacy Route 2023-10',
      waypoints: 210,
      activeDays: [],
      status: 'Archived',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Routes
        </h2>
        <button className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm">
          Upload Route
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {routes.map(r => (
          <div
            key={r.name}
            className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {r.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">
                  {r.waypoints} waypoints
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300'}`}
              >
                {r.status}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xs text-gray-600 dark:text-neutral-400">
                Active days
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => {
                  const active = r.activeDays.includes(d)
                  return (
                    <span
                      key={d}
                      className={`px-2 py-0.5 rounded-md text-xs ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300'}`}
                    >
                      {d}
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800">
                Edit
              </button>
              <button className="text-xs px-2 py-1 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20">
                Schedule
              </button>
              <button className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800">
                Activate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
