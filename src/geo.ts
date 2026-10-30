import type { CoffeeEntry, Place } from './db'

// Free OpenStreetMap services. Only the user's location or search text is sent, and only on request.
const OVERPASS_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

export interface Cafe extends Place {
  osm: string
  openingHours: string
  website: string
}

export interface LatLon {
  lat: number
  lon: number
}

export function getPosition(): Promise<LatLon> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('This browser cannot share your location.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? 'Location access was denied. Allow it in your browser settings to find cafés near you.'
              : 'Could not get your location. Try again.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  })
}

/** Cafés and coffee shops around a point (radius in metres) or inside a bounding box. */
export async function findCafes(
  area: { around: LatLon; radius: number } | { south: number; west: number; north: number; east: number },
): Promise<Cafe[]> {
  const filter =
    'around' in area
      ? `(around:${Math.round(area.radius)},${area.around.lat},${area.around.lon})`
      : `(${area.south},${area.west},${area.north},${area.east})`
  const query = `[out:json][timeout:20];
(
  nwr["amenity"="cafe"]${filter};
  nwr["shop"="coffee"]${filter};
  nwr["cuisine"~"coffee_shop"]${filter};
);
out center tags 150;`

  let lastError: unknown
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ data: query }) })
      if (!res.ok) throw new Error(`Map service returned ${res.status}`)
      const json = (await res.json()) as { elements: OverpassElement[] }
      return json.elements.map(toCafe).filter((c): c is Cafe => c !== null)
    } catch (e) {
      lastError = e
    }
  }
  console.warn('Overpass failed', lastError)
  throw new Error('Could not reach the map service. Check your connection and try again.')
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function toCafe(el: OverpassElement): Cafe | null {
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  const t = el.tags ?? {}
  if (lat == null || lon == null || !t.name) return null
  return {
    name: t.name,
    lat,
    lon,
    address: formatAddress(t),
    osm: `${el.type}/${el.id}`,
    openingHours: t.opening_hours ?? '',
    website: t.website ?? t['contact:website'] ?? '',
  }
}

function formatAddress(t: Record<string, string>): string {
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
  return [street, t['addr:suburb'] ?? t['addr:city']].filter(Boolean).join(', ')
}

/** Search for a place by name or address (OpenStreetMap Nominatim). Call on submit only, not per keystroke. */
export async function searchPlaces(q: string, near?: LatLon): Promise<Place[]> {
  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '6', addressdetails: '1' })
  if (near) {
    const d = 0.3
    params.set('viewbox', `${near.lon - d},${near.lat + d},${near.lon + d},${near.lat - d}`)
  }
  const res = await fetch(`${NOMINATIM}?${params}`)
  if (!res.ok) throw new Error('Search is unavailable right now.')
  const rows = (await res.json()) as {
    lat: string
    lon: string
    name: string
    display_name: string
    osm_type: string
    osm_id: number
  }[]
  return rows.map((r) => ({
    name: r.name || r.display_name.split(',')[0],
    lat: Number(r.lat),
    lon: Number(r.lon),
    address: r.display_name.split(',').slice(1, 4).join(',').trim(),
    osm: `${r.osm_type}/${r.osm_id}`,
  }))
}

/** Distance in metres between two points. */
export function distance(a: LatLon, b: LatLon): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`
}

export function mapsUrl(place: Place): string {
  const query = place.address ? `${place.name}, ${place.address}` : `${place.lat},${place.lon}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export interface Visits {
  count: number
  avgRating: number | null
  lastDate: string
}

/** Same OpenStreetMap id, or same name within 100 m (covers dropped pins and search results). */
export function samePlace(a: Place, b: Place): boolean {
  if (a.osm && a.osm === b.osm) return true
  const norm = (s: string) => s.trim().toLowerCase()
  return norm(a.name) === norm(b.name) && distance(a, b) < 100
}

/** The user's check-ins at a place. */
export function visitsTo(place: Place, coffees: CoffeeEntry[]): Visits | null {
  const matches = coffees.filter((c) => c.place && samePlace(c.place, place))
  if (matches.length === 0) return null
  const rated = matches.filter((c) => c.rating != null)
  return {
    count: matches.length,
    avgRating: rated.length ? rated.reduce((s, c) => s + (c.rating ?? 0), 0) / rated.length : null,
    lastDate: matches.map((c) => c.date).sort().at(-1) ?? '',
  }
}

/** Distinct places from the user's own check-ins. */
export function myPlaces(coffees: CoffeeEntry[]): Place[] {
  const places: Place[] = []
  for (const c of coffees) {
    const place = c.place
    if (place && !places.some((p) => samePlace(p, place))) places.push(place)
  }
  return places
}

export function placeToParam(p: Place): string {
  return JSON.stringify(p)
}

export function placeFromParam(s: string | null): Place | null {
  if (!s) return null
  try {
    const p = JSON.parse(s) as Place
    return typeof p.lat === 'number' && typeof p.lon === 'number' && typeof p.name === 'string'
      ? { name: p.name, lat: p.lat, lon: p.lon, address: p.address ?? '', osm: p.osm ?? null }
      : null
  } catch {
    return null
  }
}
