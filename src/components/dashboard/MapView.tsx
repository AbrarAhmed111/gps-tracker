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
  focusVehicleId?: string
}

declare global {
  interface Window {
    initGMap?: () => void
    google: any
  }
}

export default function MapView({ vehicles, focusVehicleId }: MapViewProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const infoWindowRef = useRef<any>(null)
  const [ready, setReady] = useState<boolean>(false)
  const fitRequestedRef = useRef<boolean>(false)
  const animRef = useRef<number | null>(null)
  const animStatesRef = useRef<Map<
    string,
    {
      lat: number
      lng: number
      lastT: number
      speedMs: number
      // Road-following path
      path: Array<{ lat: number; lng: number }>
      pathIdx: number
      active: boolean
    }
  >>(new Map())

  function deg2rad(x: number) {
    return (x * Math.PI) / 180
  }
  function rad2deg(x: number) {
    return (x * 180) / Math.PI
  }
  function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371000
    const dLat = deg2rad(b.lat - a.lat)
    const dLng = deg2rad(b.lng - a.lng)
    const s =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
  }
  async function getDirectionsPath(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<Array<{ lat: number; lng: number }>> {
    return new Promise((resolve) => {
      try {
        const svc = new window.google.maps.DirectionsService()
        svc.route(
          {
            origin,
            destination,
            travelMode: window.google.maps.TravelMode.DRIVING,
            provideRouteAlternatives: false,
            optimizeWaypoints: false,
          },
          (res: any, status: any) => {
            if (status === 'OK' && res?.routes?.[0]?.overview_path?.length) {
              const pts = res.routes[0].overview_path.map((ll: any) => ({
                lat: ll.lat(),
                lng: ll.lng(),
              }))
              resolve(pts)
            } else {
              resolve([origin, destination])
            }
          },
        )
      } catch {
        resolve([origin, destination])
      }
    })
  }

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
        (v.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.color) ? v.color : null) ||
        (v.status === 'moving'
          ? '#2563eb'
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
        // Immediately sync to server-reported position; continuous animation will handle motion
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

      // Update animation state for moving vehicles with speed & bearing
      if (v.status === 'moving' && typeof v.speedKmh === 'number') {
        const speedMs = Math.max(0, v.speedKmh / 3.6)
        const prev = animStatesRef.current.get(v.id)
        const origin = prev ? { lat: prev.lat, lng: prev.lng } : { lat: v.lat, lng: v.lng }
        const dest = { lat: v.lat, lng: v.lng }
        ;(async () => {
          const path = await getDirectionsPath(origin, dest)
          animStatesRef.current.set(v.id, {
            lat: origin.lat,
            lng: origin.lng,
            lastT: performance.now(),
            speedMs,
            path,
            pathIdx: 0,
            active: true,
          })
        })()
      } else {
        // Stop anim if not moving
        animStatesRef.current.delete(v.id)
      }
    }
    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.setMap(null)
        markersRef.current.delete(id)
        animStatesRef.current.delete(id)
      }
    })

    // Auto-fit once when markers first appear
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

  // Continuous animation loop based on speed and bearing
  useEffect(() => {
    if (!ready) return
    function frame(now: number) {
      animStatesRef.current.forEach((st, id) => {
        const marker = markersRef.current.get(id)
        if (!marker) return
        const dt = Math.min(1.0, Math.max(0, (now - st.lastT) / 1000)) // seconds, clamp to 1s
        st.lastT = now
        if (st.speedMs <= 0) return
        let remainingDist = st.speedMs * dt
        while (remainingDist > 0 && st.path && st.pathIdx < st.path.length) {
          const nextIdx = Math.min(st.pathIdx + 1, st.path.length - 1)
          const from = { lat: st.lat, lng: st.lng }
          const to = st.path[nextIdx]
          const segLen = haversineMeters(from, to)
          if (segLen <= 0.1) {
            st.pathIdx = nextIdx
            st.lat = to.lat
            st.lng = to.lng
            continue
          }
          if (remainingDist >= segLen) {
            // consume full segment
            st.lat = to.lat
            st.lng = to.lng
            st.pathIdx = nextIdx
            remainingDist -= segLen
          } else {
            // move partial on segment
            const p = remainingDist / segLen
            const lat = from.lat + (to.lat - from.lat) * p
            const lng = from.lng + (to.lng - from.lng) * p
            st.lat = lat
            st.lng = lng
            remainingDist = 0
          }
        }
        marker.setPosition({ lat: st.lat, lng: st.lng })
      })
      animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)
    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
  }, [ready])

  // Focus on a specific vehicle when requested
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !focusVehicleId) return
    const map = mapInstanceRef.current
    const marker = markersRef.current.get(focusVehicleId)
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
  }, [focusVehicleId, ready])

  // Load API key from DB if env is missing
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
