'use client'

export default function UsersPage() {
  const users = [
    {
      name: 'Admin User',
      role: 'Admin',
      email: 'admin@example.com',
      status: 'Active',
    },
    {
      name: 'Viewer 1',
      role: 'Viewer',
      email: 'viewer1@example.com',
      status: 'Invited',
    },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Users
        </h2>
        <button className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm shadow-sm">
          Invite User
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-neutral-900/60 text-gray-600 dark:text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Role</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr
                key={u.email}
                className="border-t border-gray-100 dark:border-neutral-800"
              >
                <td className="px-4 py-2 text-gray-900 dark:text-white">
                  {u.name}
                </td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                  {u.email}
                </td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-200">
                  {u.role}
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300">
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex gap-2">
                    <button className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800">
                      Edit
                    </button>
                    <button className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/20">
                      Remove
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
