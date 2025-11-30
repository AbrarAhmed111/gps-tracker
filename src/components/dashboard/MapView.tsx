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
  nextTarget?: { lat: number; lng: number }
  etaToNextMs?: number
  waypoints?: Array<{ lat: number; lng: number; sequence: number }>
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
  const animRef = useRef<number | null>(null)
  const idlePhaseRef = useRef<Map<string, boolean>>(new Map())
  const animStatesRef = useRef<Map<
    string,
    {
      from: { lat: number; lng: number }
      to: { lat: number; lng: number }
      start: number
      duration: number
      base: { lat: number; lng: number }
      drift: boolean
      origin?: { lat: number; lng: number }
      roadPath?: any[] | null
    }
  >>(new Map())
  const vehiclesMapRef = useRef<Map<string, VehicleMarker>>(new Map())
  const simulatedPositionsRef = useRef<Map<string, { lat: number; lng: number; timestamp: number }>>(new Map())
  const waypointSequencesRef = useRef<Map<string, number>>(new Map()) // Track current waypoint sequence
  const roadPathsCache = useRef<Map<string, any[]>>(new Map()) // Cache road paths (LatLng[])
  const directionsServiceRef = useRef<any>(null) // DirectionsService

  // Haversine distance calculation (in kilometers)
  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Calculate distance along a path of coordinates
  const calculatePathDistance = (path: any[]): number => {
    if (path.length < 2) return 0
    let total = 0
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1]
      const curr = path[i]
      const prevLat = typeof prev.lat === 'function' ? prev.lat() : prev.lat
      const prevLng = typeof prev.lng === 'function' ? prev.lng() : prev.lng
      const currLat = typeof curr.lat === 'function' ? curr.lat() : curr.lat
      const currLng = typeof curr.lng === 'function' ? curr.lng() : curr.lng
      total += haversineDistance(prevLat, prevLng, currLat, currLng)
    }
    return total
  }

  // Get road path between two points using Google Directions API
  const getRoadPath = async (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): Promise<any[] | null> => {
    const cacheKey = `${from.lat.toFixed(6)},${from.lng.toFixed(6)}_${to.lat.toFixed(6)},${to.lng.toFixed(6)}`
    
    // Check cache first
    if (roadPathsCache.current.has(cacheKey)) {
      return roadPathsCache.current.get(cacheKey)!
    }

    if (!window.google || !window.google.maps) return null
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new window.google.maps.DirectionsService()
    }

    return new Promise((resolve) => {
      try {
        directionsServiceRef.current!.route(
          {
            origin: new window.google.maps.LatLng(from.lat, from.lng),
            destination: new window.google.maps.LatLng(to.lat, to.lng),
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result: any, status: any) => {
            if (status === window.google.maps.DirectionsStatus.OK && result) {
              const path: any[] = []
              const route = result.routes[0]
              if (route && route.overview_path) {
                route.overview_path.forEach((point: any) => {
                  path.push(point)
                })
                // Cache the path
                roadPathsCache.current.set(cacheKey, path)
                resolve(path)
              } else {
                resolve(null)
              }
            } else {
              // If Directions API fails or is not enabled, fall back to straight line
              // Silently fail - this is expected if Directions API is not enabled
              resolve(null)
            }
          }
        )
      } catch (error) {
        // If Directions Service is not available, fall back to straight line
        resolve(null)
      }
    })
  }

  // Get position along a path at a given progress (0-1)
  const getPositionAlongPath = (path: any[], progress: number): { lat: number; lng: number } => {
    if (!path || path.length === 0) {
      return { lat: 0, lng: 0 }
    }
    
    const getLat = (p: any) => typeof p.lat === 'function' ? p.lat() : p.lat
    const getLng = (p: any) => typeof p.lng === 'function' ? p.lng() : p.lng
    
    if (progress <= 0) {
      return { lat: getLat(path[0]), lng: getLng(path[0]) }
    }
    if (progress >= 1) {
      return { lat: getLat(path[path.length - 1]), lng: getLng(path[path.length - 1]) }
    }

    // Calculate total distance
    const totalDistance = calculatePathDistance(path)
    const targetDistance = totalDistance * progress

    // Find the segment where the target distance falls
    let accumulatedDistance = 0
    for (let i = 1; i < path.length; i++) {
      const segmentDistance = haversineDistance(
        getLat(path[i - 1]),
        getLng(path[i - 1]),
        getLat(path[i]),
        getLng(path[i])
      )
      
      if (accumulatedDistance + segmentDistance >= targetDistance) {
        // Interpolate within this segment
        const segmentProgress = segmentDistance > 0 
          ? (targetDistance - accumulatedDistance) / segmentDistance 
          : 0
        const lat = getLat(path[i - 1]) + (getLat(path[i]) - getLat(path[i - 1])) * segmentProgress
        const lng = getLng(path[i - 1]) + (getLng(path[i]) - getLng(path[i - 1])) * segmentProgress
        return { lat, lng }
      }
      
      accumulatedDistance += segmentDistance
    }

    return { lat: getLat(path[path.length - 1]), lng: getLng(path[path.length - 1]) }
  }

  // Calculate animation duration based on distance and speed (using road path if available)
  const calculateAnimationDuration = async (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    speedKmh?: number,
    roadPath?: any[] | null
  ): Promise<number> => {
    let distanceKm: number
    if (roadPath && roadPath.length > 0) {
      // Use actual road distance
      distanceKm = calculatePathDistance(roadPath)
    } else {
      // Fall back to straight-line distance
      distanceKm = haversineDistance(from.lat, from.lng, to.lat, to.lng)
    }
    // Use vehicle speed if available, otherwise default to 30 km/h for smooth animation
    const effectiveSpeed = speedKmh && speedKmh > 0 ? speedKmh : 30
    // Calculate time in milliseconds: (distance / speed) * 3600000 (hours to ms)
    const timeMs = (distanceKm / effectiveSpeed) * 3600000
    // Ensure minimum duration of 2 seconds and maximum of 5 minutes for smooth animation
    return Math.max(2000, Math.min(300000, timeMs))
  }

  // Find next waypoint in sequence
  const findNextWaypoint = (
    vehicle: VehicleMarker,
    currentTarget: { lat: number; lng: number }
  ): { lat: number; lng: number } | null => {
    if (!vehicle.waypoints || vehicle.waypoints.length === 0) return null
    
    // Find current waypoint index
    let currentIndex = -1
    for (let i = 0; i < vehicle.waypoints.length; i++) {
      const wp = vehicle.waypoints[i]
      const dist = haversineDistance(currentTarget.lat, currentTarget.lng, wp.lat, wp.lng)
      if (dist < 0.01) { // Within 10 meters, consider it the same waypoint
        currentIndex = i
        break
      }
    }
    
    // If not found, find closest waypoint
    if (currentIndex === -1) {
      let minDist = Infinity
      for (let i = 0; i < vehicle.waypoints.length; i++) {
        const wp = vehicle.waypoints[i]
        const dist = haversineDistance(currentTarget.lat, currentTarget.lng, wp.lat, wp.lng)
        if (dist < minDist) {
          minDist = dist
          currentIndex = i
        }
      }
    }
    
    // Return next waypoint in sequence
    if (currentIndex >= 0 && currentIndex < vehicle.waypoints.length - 1) {
      return {
        lat: vehicle.waypoints[currentIndex + 1].lat,
        lng: vehicle.waypoints[currentIndex + 1].lng,
      }
    }
    
    return null
  }

  useEffect(() => {
    const map = new Map<string, VehicleMarker>()
    vehicles.forEach(v => map.set(v.id, v))
    vehiclesMapRef.current = map
  }, [vehicles])

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
    const now = performance.now()

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
      }

      const prevAnim = animStatesRef.current.get(v.id)
      const currentPos = marker!.getPosition()
      const target = { lat: v.lat, lng: v.lng }
      
      // Update simulated position when API provides new position
      if (v.lastUpdated) {
        simulatedPositionsRef.current.set(v.id, {
          lat: target.lat,
          lng: target.lng,
          timestamp: now,
        })
      }
      
      const shouldAnimate =
        v.status === 'moving' &&
        currentPos &&
        (Math.abs(currentPos.lat() - target.lat) > 1e-6 ||
          Math.abs(currentPos.lng() - target.lng) > 1e-6)

      if (shouldAnimate) {
        // Smooth transition to API-provided position
        const duration = 2000
        const fromPos = { lat: currentPos.lat(), lng: currentPos.lng() }
        animStatesRef.current.set(v.id, {
          from: fromPos,
          to: target,
          start: now,
          duration,
          base: target,
          drift: false,
          origin: fromPos,
        })
        // Update simulated position
        simulatedPositionsRef.current.set(v.id, {
          lat: target.lat,
          lng: target.lng,
          timestamp: now,
        })
      } else if (v.status === 'moving' && v.nextTarget) {
        // Use API-provided nextTarget with calculated duration
        const currentPosition = currentPos ? { lat: currentPos.lat(), lng: currentPos.lng() } : target
        if (v.nextTarget) {
          // Fetch road path for this segment
          getRoadPath(currentPosition, v.nextTarget).then(roadPath => {
            calculateAnimationDuration(currentPosition, v.nextTarget!, v.speedKmh, roadPath).then(duration => {
              animStatesRef.current.set(v.id, {
                from: currentPosition,
                to: v.nextTarget!,
                start: performance.now(),
                duration,
                base: v.nextTarget!,
                drift: false,
                origin: currentPosition,
                roadPath: roadPath || null,
              })
            })
          })
        }
      } else if (v.status === 'moving' && v.waypoints && v.waypoints.length > 0) {
        // No API target, but we have waypoints - calculate next waypoint dynamically
        const simPos = simulatedPositionsRef.current.get(v.id)
        const currentPosition = currentPos
          ? { lat: currentPos.lat(), lng: currentPos.lng() }
          : simPos
          ? { lat: simPos.lat, lng: simPos.lng }
          : target
        
        // Find next waypoint in sequence
        const nextWp = findNextWaypoint(v, currentPosition)
        if (nextWp) {
          // Fetch road path for this segment
          getRoadPath(currentPosition, nextWp).then(roadPath => {
            calculateAnimationDuration(currentPosition, nextWp, v.speedKmh, roadPath).then(duration => {
              animStatesRef.current.set(v.id, {
                from: currentPosition,
                to: nextWp,
                start: performance.now(),
                duration,
                base: nextWp,
                drift: false,
                origin: currentPosition,
                roadPath: roadPath || null,
              })
            })
          })
        } else {
          // No next waypoint found, start drift
          const phase = idlePhaseRef.current.get(v.id) ?? false
          idlePhaseRef.current.set(v.id, !phase)
          const offsetLat = (phase ? 1 : -1) * 0.00005
          const offsetLng = (phase ? -1 : 1) * 0.00005
          animStatesRef.current.set(v.id, {
            from: { lat: target.lat, lng: target.lng },
            to: { lat: target.lat + offsetLat, lng: target.lng + offsetLng },
            start: now,
            duration: 12000, // Slower drift animation
            base: target,
            drift: true,
          })
        }
      } else if (v.status === 'moving') {
        // No waypoints available, start drift
        const phase = idlePhaseRef.current.get(v.id) ?? false
        idlePhaseRef.current.set(v.id, !phase)
        const offsetLat = (phase ? 1 : -1) * 0.00005
        const offsetLng = (phase ? -1 : 1) * 0.00005
        animStatesRef.current.set(v.id, {
          from: { lat: target.lat, lng: target.lng },
          to: { lat: target.lat + offsetLat, lng: target.lng + offsetLng },
          start: now,
          duration: 12000,
          base: target,
          drift: true,
        })
      } else {
        animStatesRef.current.delete(v.id)
        marker!.setPosition(target)
      }

      marker!.setIcon({
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: iconColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8,
        })
      }

    markersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.setMap(null)
        markersRef.current.delete(id)
        animStatesRef.current.delete(id)
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
    if (!ready) return
    function frame(now: number) {
      animStatesRef.current.forEach((state, id) => {
        const marker = markersRef.current.get(id)
        if (!marker) {
          animStatesRef.current.delete(id)
          return
        }
        const progress = Math.min(1, Math.max(0, (now - state.start) / state.duration))
        
        // Use road path if available, otherwise use straight-line interpolation
        let lat: number
        let lng: number
        
        if (state.roadPath && state.roadPath.length > 0) {
          // Animate along the road path
          const pos = getPositionAlongPath(state.roadPath, progress)
          lat = pos.lat
          lng = pos.lng
        } else {
          // Fall back to straight-line interpolation
          lat = state.from.lat + (state.to.lat - state.from.lat) * progress
          lng = state.from.lng + (state.to.lng - state.from.lng) * progress
        }
        
        marker.setPosition({ lat, lng })
        
        // Update simulated position continuously for accurate tracking
        simulatedPositionsRef.current.set(id, {
          lat,
          lng,
          timestamp: now,
        })
        
        if (progress >= 1) {
          const vehicle = vehiclesMapRef.current.get(id)
          if (state.drift) {
            if (vehicle && vehicle.status === 'moving') {
              const phase = idlePhaseRef.current.get(id) ?? false
              idlePhaseRef.current.set(id, !phase)
              const offsetLat = (phase ? 1 : -1) * 0.00005
              const offsetLng = (phase ? -1 : 1) * 0.00005
              state.from = state.to
              state.to = {
                lat: state.base.lat + offsetLat,
                lng: state.base.lng + offsetLng,
              }
              state.start = now
              state.duration = 18000 // Slower drift animation
            } else {
              animStatesRef.current.delete(id)
            }
          } else if (vehicle && vehicle.status === 'moving') {
            // Animation completed - move to next waypoint
            const currentSimPos = simulatedPositionsRef.current.get(id)
            const currentPosition = currentSimPos
              ? { lat: currentSimPos.lat, lng: currentSimPos.lng }
              : { lat: state.to.lat, lng: state.to.lng }
            
            // Try to find next waypoint
            const nextWp = vehicle.nextTarget || (vehicle.waypoints ? findNextWaypoint(vehicle, state.to) : null)
            
            if (nextWp) {
              // Fetch road path for next segment
              getRoadPath(currentPosition, nextWp).then(roadPath => {
                calculateAnimationDuration(currentPosition, nextWp, vehicle.speedKmh, roadPath).then(duration => {
                  animStatesRef.current.set(id, {
                    from: currentPosition,
                    to: nextWp,
                    start: performance.now(),
                    duration,
                    base: nextWp,
                    drift: false,
                    origin: currentPosition,
                    roadPath: roadPath || null,
                  })
                })
              })
            } else {
              // No more waypoints, start drift
              const phase = idlePhaseRef.current.get(id) ?? false
              idlePhaseRef.current.set(id, !phase)
              const offsetLat = (phase ? 1 : -1) * 0.00005
              const offsetLng = (phase ? -1 : 1) * 0.00005
              animStatesRef.current.set(id, {
                from: currentPosition,
                to: { lat: currentPosition.lat + offsetLat, lng: currentPosition.lng + offsetLng },
                start: now,
                duration: 18000,
                base: currentPosition,
                drift: true,
              })
            }
          } else {
            animStatesRef.current.delete(id)
          }
        }
      })
      animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)
    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current)
      animRef.current = null
      animStatesRef.current.clear()
      idlePhaseRef.current.clear()
    }
  }, [ready])

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
