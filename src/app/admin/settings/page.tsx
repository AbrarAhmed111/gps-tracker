'use client'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        System Settings
      </h2>

      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Refresh Interval
        </h3>
        <p className="text-xs text-gray-600 dark:text-neutral-400">
          Controls how often the public dashboard refreshes simulated positions.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            placeholder="10"
            className="w-24 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            minutes
          </span>
          <button className="ml-auto px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm">
            Save
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Google Maps API Key
        </h3>
        <p className="text-xs text-gray-600 dark:text-neutral-400">
          Used for map rendering and optional geocoding. Keep this key secure.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="password"
            placeholder="•••••••••••••"
            className="flex-1 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800">
            Reveal
          </button>
          <button className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
