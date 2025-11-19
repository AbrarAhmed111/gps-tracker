'use client'

import Script from 'next/script'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type VehicleMarker = {
  id: string
  name: string
  lat: number
  lng: number
  status: 'moving' | 'parked' | 'inactive'
  color?: string
  speedKmh?: number
  lastUpdated?: string
  etaNextMinutes?: number
  vehicleNumber?: string
  vehicleType?: string
  bearing?: number
}

type MapViewProps = {
  vehicles: VehicleMarker[]
  focusRequest?: { id: string; ts: number }
}

declare global {
  interface Window {
    initGMap?: () => void
    google: any
  }
}

export default function MapView({ vehicles, focusRequest }: MapViewProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const infoWindowRef = useRef<any>(null)
  const [ready, setReady] = useState<boolean>(false)
  const fitRequestedRef = useRef<boolean>(false)

  const center = useMemo(() => {
    if (vehicles.length > 0) {
      return { lat: vehicles[0].lat, lng: vehicles[0].lng }
    }
    return { lat: 37.7749, lng: -122.4194 }
  }, [vehicles])

  useEffect(() => {
    window.initGMap = () => {
      if (!mapRef.current) return
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })
      setReady(true)
    }
    return () => {
      window.initGMap = undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return
    const map = mapInstanceRef.current
    const seen = new Set<string>()
    for (const v of vehicles) {
      seen.add(v.id)
      let marker = markersRef.current.get(v.id)
      const iconColor =
        (v.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.color) ? v.color : null) ||
        (v.status === 'moving'
          ? '#7ee600'
          : v.status === 'parked'
            ? '#f59e0b'
            : '#6b7280')
      if (!marker) {
        marker = new window.google.maps.Marker({
          position: { lat: v.lat, lng: v.lng },
          map,
          title: v.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: iconColor,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 8,
          },
        })
        marker.addListener('click', () => {
          const content = `
            <div style="min-width:180px">
              <div style="font-weight:600;margin-bottom:4px">${v.name}</div>
              ${v.vehicleNumber ? `<div style="font-size:12px;color:#4b5563">No: ${v.vehicleNumber}</div>` : ''}
              ${v.vehicleType ? `<div style="font-size:12px;color:#4b5563">Type: ${v.vehicleType}</div>` : ''}
              <div style="font-size:12px;color:#4b5563">Status: ${v.status}</div>
              <div style="font-size:12px;color:#4b5563">Pos: ${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}</div>
              ${typeof v.speedKmh === 'number' ? `<div style="font-size:12px;color:#4b5563">Speed: ${v.speedKmh.toFixed(1)} km/h</div>` : ''}
              ${typeof v.etaNextMinutes === 'number' ? `<div style="font-size:12px;color:#4b5563">ETA: ${v.etaNextMinutes.toFixed(1)} min</div>` : ''}
              ${v.lastUpdated ? `<div style="font-size:12px;color:#6b7280">Updated: ${new Date(v.lastUpdated).toLocaleTimeString()}</div>` : ''}
            </div>
          `
          if (!infoWindowRef.current) {
            infoWindowRef.current = new window.google.maps.InfoWindow()
          }
          infoWindowRef.current.setContent(content)
          infoWindowRef.current.open({ anchor: marker, map })
        })
        markersRef.current.set(v.id, marker)
      } else {
        marker.setPosition({ lat: v.lat, lng: v.lng })
        marker.setIcon({
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: iconColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8,
        })
      }
    }
    markersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.setMap(null)
        markersRef.current.delete(id)
      }
    })

    if (!fitRequestedRef.current && markersRef.current.size > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      markersRef.current.forEach(marker => {
        const pos = marker.getPosition()
        if (pos) bounds.extend(pos)
      })
      map.fitBounds(bounds, 48)
      fitRequestedRef.current = true
    }
  }, [vehicles, ready])

  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !focusRequest?.id) return
    const map = mapInstanceRef.current
    const marker = markersRef.current.get(focusRequest.id)
    if (marker) {
      const pos = marker.getPosition()
      if (pos) {
        map.panTo(pos)
        const currentZoom = map.getZoom()
        if (typeof currentZoom === 'number' && currentZoom < 14) {
          map.setZoom(14)
        }
      }
    }
  }, [focusRequest, ready])

  useEffect(() => {
    if (apiKey) return
    let active = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'google_maps_api_key')
          .maybeSingle()
        if (!active) return
        const key = (data?.setting_value as string) || ''
        if (key) setApiKey(key)
      } catch {
        // ignore
      }
    })()
    return () => {
      active = false
    }
  }, [apiKey])

  return (
    <div className="relative w-full h-full">
      {!apiKey && (
        <div className="absolute inset-0 grid place-items-center z-10">
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-neutral-700 p-6 text-center text-sm text-gray-600 dark:text-neutral-400 bg-white/70 dark:bg-neutral-900/70">
            Google Maps key not configured. Set it in Admin → Settings.
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {ready && (
        <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-2">
          <button
            onClick={() => {
              const map = mapInstanceRef.current
              if (!map || markersRef.current.size === 0) return
              const bounds = new window.google.maps.LatLngBounds()
              markersRef.current.forEach(marker => {
                const pos = marker.getPosition()
                if (pos) bounds.extend(pos)
              })
              map.fitBounds(bounds, 48)
              fitRequestedRef.current = true
            }}
            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 backdrop-blur text-sm text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-neutral-800 shadow-sm"
          >
            Fit to vehicles
          </button>
        </div>
      )}
      {apiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGMap`}
          strategy="afterInteractive"
        />
      )}
    </div>
  )
}
