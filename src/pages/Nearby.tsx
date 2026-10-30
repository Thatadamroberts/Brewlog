import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapView, type MapMarker } from '../components/MapView'
import { RatingDisplay } from '../components/Rating'
import { db, type Place } from '../db'
import {
  distance,
  findCafes,
  formatDistance,
  getPosition,
  mapsUrl,
  myPlaces,
  placeToParam,
  samePlace,
  visitsTo,
  type Cafe,
  type LatLon,
  type Visits,
} from '../geo'
import { formatDate } from '../options'

const RADII = [500, 1000, 2000]

interface Row {
  place: Place
  key: string
  meters: number
  visits: Visits | null
  openingHours: string
  website: string
}

// Kept for the session so switching tabs doesn't hit the map service again.
let lastSearch: { me: LatLon; radius: number; cafes: Cafe[] } | null = null

export function Nearby() {
  const coffees = useLiveQuery(() => db.coffees.toArray(), [])
  const [me, setMe] = useState<LatLon | null>(lastSearch?.me ?? null)
  const [radius, setRadius] = useState(lastSearch?.radius ?? 1000)
  const [cafes, setCafes] = useState<Cafe[]>(lastSearch?.cafes ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sort, setSort] = useState<'near' | 'mine'>('near')
  const [focus, setFocus] = useState<string | null>(null)

  async function search(r = radius) {
    setBusy(true)
    setError('')
    try {
      const pos = await getPosition()
      setMe(pos)
      const found = await findCafes({ around: pos, radius: r })
      setCafes(found)
      lastSearch = { me: pos, radius: r, cafes: found }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // If location is already allowed, search straight away; otherwise wait for the button.
  useEffect(() => {
    if (lastSearch) return
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'granted') void search()
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo<Row[]>(() => {
    if (!me || !coffees) return []
    const list: Row[] = cafes.map((c) => ({
      place: c,
      key: c.osm,
      meters: distance(me, c),
      visits: visitsTo(c, coffees),
      openingHours: c.openingHours,
      website: c.website,
    }))
    // Places from the user's own check-ins that the map service didn't return (e.g. dropped pins).
    for (const p of myPlaces(coffees)) {
      const meters = distance(me, p)
      if (meters > radius) continue
      if (cafes.some((c) => samePlace(c, p))) continue
      list.push({
        place: p,
        key: p.osm ?? `${p.name}@${p.lat},${p.lon}`,
        meters,
        visits: visitsTo(p, coffees),
        openingHours: '',
        website: '',
      })
    }
    return list.sort((a, b) =>
      sort === 'mine'
        ? (b.visits?.avgRating ?? -1) - (a.visits?.avgRating ?? -1) ||
          (b.visits?.count ?? 0) - (a.visits?.count ?? 0) ||
          a.meters - b.meters
        : a.meters - b.meters,
    )
  }, [me, cafes, coffees, radius, sort])

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = rows.map((r) => ({
      id: r.key,
      lat: r.place.lat,
      lon: r.place.lon,
      kind: r.key === focus ? 'selected' : r.visits ? 'visited' : 'cafe',
      label: r.place.name,
    }))
    if (me) list.push({ id: 'me', ...me, kind: 'me', label: 'You' })
    return list
  }, [rows, me, focus])

  const focused = rows.find((r) => r.key === focus)
  const visitedCount = rows.filter((r) => r.visits).length

  return (
    <div className="nearby">
      <h1>Cafés nearby</h1>

      {!me ? (
        <section className="panel center">
          <p>Find cafés around you, with your own ratings for the ones you've been to.</p>
          <button type="button" className="btn btn-primary" onClick={() => search()} disabled={busy}>
            {busy ? 'Locating…' : '📍 Find cafés near me'}
          </button>
          <p className="muted small">
            Your location is sent to OpenStreetMap only to look up cafés. Your coffee log stays on this device.
          </p>
        </section>
      ) : (
        <>
          <MapView
            center={focused?.place ?? me}
            zoom={focused ? 17 : radius <= 500 ? 16 : radius <= 1000 ? 15 : 14}
            viewKey={`${focus ?? 'me'}-${me.lat}-${me.lon}-${radius}`}
            markers={markers}
            onMarkerClick={(id) => {
              setFocus(id)
              document.getElementById(`cafe-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          />
          <div className="toolbar nearby-toolbar">
            <select
              value={radius}
              aria-label="Distance"
              onChange={(e) => {
                const r = Number(e.target.value)
                setRadius(r)
                setFocus(null)
                void search(r)
              }}
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  Within {formatDistance(r)}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as 'near' | 'mine')} aria-label="Sort by">
              <option value="near">Nearest</option>
              <option value="mine">My favourites</option>
            </select>
            <button type="button" className="btn" onClick={() => search()} disabled={busy} aria-label="Refresh">
              {busy ? '…' : '↻'}
            </button>
          </div>
          {!busy && !error && (
            <p className="muted small">
              {rows.length} café{rows.length === 1 ? '' : 's'}
              {visitedCount ? `, ${visitedCount} you've visited` : ''}
            </p>
          )}
        </>
      )}

      {error && <p className="error">{error}</p>}

      <ul className="nearby-list">
        {rows.map((r) => (
          <li
            key={r.key}
            id={`cafe-${r.key}`}
            className={`panel nearby-item ${r.key === focus ? 'focused' : ''}`}
            onClick={() => setFocus(r.key)}
          >
            <div className="nearby-head">
              <strong>{r.place.name}</strong>
              <span className="muted">{formatDistance(r.meters)}</span>
            </div>
            {r.place.address && <div className="muted small">{r.place.address}</div>}
            {r.openingHours && <div className="muted small">🕒 {r.openingHours}</div>}
            {r.visits && (
              <div className="nearby-visits">
                <span className="chip">
                  {r.visits.count} check-in{r.visits.count === 1 ? '' : 's'}
                </span>
                <RatingDisplay value={r.visits.avgRating} />
                <span className="muted small">Last {formatDate(r.visits.lastDate)}</span>
              </div>
            )}
            <div className="actions">
              <Link
                to={`/new?place=${encodeURIComponent(placeToParam(r.place))}`}
                className="btn btn-primary btn-small"
                onClick={(e) => e.stopPropagation()}
              >
                Check in here
              </Link>
              <a
                href={mapsUrl(r.place)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-small"
                onClick={(e) => e.stopPropagation()}
              >
                Open in Maps
              </a>
              {r.website && (
                <a
                  href={r.website}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-small"
                  onClick={(e) => e.stopPropagation()}
                >
                  Website
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {me && !busy && !error && rows.length === 0 && (
        <p className="muted center">No cafés are mapped within {formatDistance(radius)}. Try a wider distance.</p>
      )}
      <p className="muted small center osm-credit">
        Café data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
      </p>
    </div>
  )
}
