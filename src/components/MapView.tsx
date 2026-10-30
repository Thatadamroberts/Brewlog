import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { LatLon } from '../geo'

export type MarkerKind = 'cafe' | 'visited' | 'me' | 'selected'

export interface MapMarker extends LatLon {
  id: string
  kind: MarkerKind
  label?: string
}

export interface MapBounds {
  south: number
  west: number
  north: number
  east: number
}

interface Props {
  /** Where to centre the map. The map moves only when `viewKey` changes, so panning isn't undone on re-render. */
  center: LatLon
  zoom: number
  viewKey?: string
  markers: MapMarker[]
  interactive?: boolean
  className?: string
  onMarkerClick?: (id: string) => void
  onMapClick?: (p: LatLon) => void
  onMoveEnd?: (bounds: MapBounds, center: LatLon) => void
}

const RADIUS: Record<MarkerKind, number> = { cafe: 7, visited: 9, me: 7, selected: 11 }

export function MapView({
  center,
  zoom,
  viewKey,
  markers,
  interactive = true,
  className,
  onMarkerClick,
  onMapClick,
  onMoveEnd,
}: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  // Latest callbacks, so Leaflet handlers registered once still call the current props.
  const handlers = useRef({ onMarkerClick, onMapClick, onMoveEnd })
  handlers.current = { onMarkerClick, onMapClick, onMoveEnd }

  useEffect(() => {
    if (!container.current) return
    const m = L.map(container.current, {
      center: [center.lat, center.lon],
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      attributionControl: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    m.on('click', (e) => handlers.current.onMapClick?.({ lat: e.latlng.lat, lon: e.latlng.lng }))
    m.on('moveend', () => {
      const b = m.getBounds()
      const c = m.getCenter()
      handlers.current.onMoveEnd?.(
        { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
        { lat: c.lat, lon: c.lng },
      )
    })
    map.current = m
    // The container may still be settling its size (e.g. inside an overlay).
    const t = setTimeout(() => m.invalidateSize(), 50)
    return () => {
      clearTimeout(t)
      // Stop any pan/zoom animation first; removing mid-animation makes Leaflet throw.
      m.off()
      m.stop()
      m.remove()
      map.current = null
    }
    // Created once; later changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    map.current?.setView([center.lat, center.lon], zoom, { animate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey])

  useEffect(() => {
    const g = layer.current
    if (!g) return
    g.clearLayers()
    // Draw selected and "me" last so they sit on top.
    const order: MarkerKind[] = ['cafe', 'visited', 'me', 'selected']
    for (const kind of order) {
      for (const mk of markers.filter((x) => x.kind === kind)) {
        const marker = L.circleMarker([mk.lat, mk.lon], {
          radius: RADIUS[kind],
          className: `map-marker map-marker-${kind}`,
          bubblingMouseEvents: false,
        })
        if (mk.label) marker.bindTooltip(mk.label, { direction: 'top', offset: [0, -8] })
        if (kind !== 'me') marker.on('click', () => handlers.current.onMarkerClick?.(mk.id))
        marker.addTo(g)
      }
    }
  }, [markers])

  return <div ref={container} className={`map ${className ?? ''}`} />
}
