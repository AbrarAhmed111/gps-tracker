'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

const SETTING_KEYS = {
  appName: 'app_name',
  mapsKey: 'google_maps_api_key',
  refreshSec: 'map_refresh_interval_sec',
  maintenance: 'maintenance_mode_enabled',
} as const

export default function SettingsPage() {
  const [appName, setAppName] = useState<string>('')
  const [refreshMinutes, setRefreshMinutes] = useState<number>(10)
  const [mapsKey, setMapsKey] = useState<string>('')
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false)
  const [showKey, setShowKey] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<{
    app: boolean
    interval: boolean
    map: boolean
    maintenance: boolean
  }>({
    app: false,
    interval: false,
    map: false,
    maintenance: false,
  })

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          SETTING_KEYS.appName,
          SETTING_KEYS.mapsKey,
          SETTING_KEYS.refreshSec,
          SETTING_KEYS.maintenance,
        ])
      if (!active) return
      if (error) {
        toast.error('Failed to load settings')
        setLoading(false)
        return
      }
      const get = (key: string) =>
        data?.find(d => d.setting_key === key)?.setting_value ?? ''
      setAppName(get(SETTING_KEYS.appName))
      const secStr = get(SETTING_KEYS.refreshSec)
      const secNum = Number(secStr || '600')
      setRefreshMinutes(
        Number.isFinite(secNum) ? Math.max(1, Math.round(secNum / 60)) : 10,
      )
      setMapsKey(get(SETTING_KEYS.mapsKey))
      setMaintenanceMode(get(SETTING_KEYS.maintenance) === 'true')
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  async function upsertSetting(key: string, value: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('system_settings')
      .upsert([{ setting_key: key, setting_value: value }], {
        onConflict: 'setting_key',
      })
    if (error) throw error
  }

  async function saveAppName() {
    try {
      setSaving(s => ({ ...s, app: true }))
      await upsertSetting(SETTING_KEYS.appName, appName.trim())
      toast.success('App name saved')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save app name')
    } finally {
      setSaving(s => ({ ...s, app: false }))
    }
  }

  async function saveRefresh() {
    try {
      setSaving(s => ({ ...s, interval: true }))
      const minutes = Math.max(1, Math.round(refreshMinutes))
      await upsertSetting(SETTING_KEYS.refreshSec, String(minutes * 60))
      toast.success('Refresh interval saved')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save refresh interval')
    } finally {
      setSaving(s => ({ ...s, interval: false }))
    }
  }

  async function saveMapsKey() {
    try {
      setSaving(s => ({ ...s, map: true }))
      await upsertSetting(SETTING_KEYS.mapsKey, mapsKey)
      toast.success('Maps API key saved')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save API key')
    } finally {
      setSaving(s => ({ ...s, map: false }))
    }
  }

  async function saveMaintenance() {
    try {
      setSaving(s => ({ ...s, maintenance: true }))
      await upsertSetting(
        SETTING_KEYS.maintenance,
        maintenanceMode ? 'true' : 'false',
      )
      toast.success('Maintenance mode updated')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update maintenance mode')
    } finally {
      setSaving(s => ({ ...s, maintenance: false }))
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        System Settings
      </h2>

      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Application
        </h3>
        <p className="text-xs text-gray-600 dark:text-neutral-400">
          Name displayed across the dashboard.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={appName}
            onChange={e => setAppName(e.target.value)}
            placeholder="GPS Tracking Dashboard"
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={saveAppName}
            disabled={loading || saving.app}
            className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm shadow-sm"
          >
            {saving.app ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

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
            value={refreshMinutes}
            onChange={e => setRefreshMinutes(Number(e.target.value))}
            min={1}
            disabled={loading}
            className="w-24 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            minutes
          </span>
          <button
            onClick={saveRefresh}
            disabled={loading || saving.interval}
            className="ml-auto px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm shadow-sm"
          >
            {saving.interval ? 'Saving…' : 'Save'}
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
            type={showKey ? 'text' : 'password'}
            value={mapsKey}
            onChange={e => setMapsKey(e.target.value)}
            disabled={loading}
            placeholder="•••••••••••••"
            className="flex-1 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={() => setShowKey(v => !v)}
            disabled={loading}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
          >
            {showKey ? 'Hide' : 'Reveal'}
          </button>
          <button
            onClick={saveMapsKey}
            disabled={loading || saving.map}
            className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm shadow-sm"
          >
            {saving.map ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Maintenance Mode
        </h3>
        <p className="text-xs text-gray-600 dark:text-neutral-400">
          Temporarily hides the public dashboard behind a maintenance message.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={maintenanceMode}
              onChange={e => setMaintenanceMode(e.target.checked)}
              disabled={loading}
            />
            Enable maintenance screen
          </label>
          <button
            onClick={saveMaintenance}
            disabled={loading || saving.maintenance}
            className="ml-auto px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm shadow-sm"
          >
            {saving.maintenance ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
