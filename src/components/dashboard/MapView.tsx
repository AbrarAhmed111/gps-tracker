'use client'

import Script from 'next/script'
import { useEffect, useMemo, useRef, useState } from 'react'

export type VehicleMarker = {
  id: string
  name: string
  lat: number
  lng: number
  status: 'moving' | 'parked' | 'inactive'
}

type MapViewProps = {
  vehicles: VehicleMarker[]
}

declare global {
  interface Window {
    initGMap?: () => void
    google: any
  }
}

export default function MapView({ vehicles }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
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

    // Update or create markers
    const seen = new Set<string>()
    for (const v of vehicles) {
      seen.add(v.id)
      let marker = markersRef.current.get(v.id)
      const iconColor =
        v.status === 'moving'
          ? '#2563eb'
          : v.status === 'parked'
            ? '#f59e0b'
            : '#6b7280'

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
    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.setMap(null)
        markersRef.current.delete(id)
      }
    })
  }, [vehicles, ready])

  return (
    <div className="relative w-full h-full">
      {!apiKey && (
        <div className="absolute inset-0 grid place-items-center z-10">
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-neutral-700 p-6 text-center text-sm text-gray-600 dark:text-neutral-400 bg-white/70 dark:bg-neutral-900/70">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to load the map.
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
