import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Place } from '../db'
import { distance, findCafes, formatDistance, getPosition, searchPlaces, type Cafe, type LatLon } from '../geo'
import { MapView, type MapBounds, type MapMarker } from './MapView'

const WORLD: LatLon = { lat: 20, lon: 0 }

/** Full-screen map for tagging a check-in with a café, a search result, or a dropped pin. */
export function MapPicker({
  initial,
  pinName,
  onPick,
  onClose,
}: {
  initial: Place | null
  /** Name to give a dropped pin, e.g. what's typed in "Place / seller" */
  pinName: string
  onPick: (p: Place) => void
  onClose: () => void
}) {
  const [view, setView] = useState<{ center: LatLon; zoom: number; key: string }>(
    initial ? { center: initial, zoom: 17, key: 'initial' } : { center: WORLD, zoom: 2, key: 'world' },
  )
  const [me, setMe] = useState<LatLon | null>(null)
  const [cafes, setCafes] = useState<Cafe[]>([])
  const [selected, setSelected] = useState<Place | null>(initial)
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [zoomedIn, setZoomedIn] = useState(!!initial)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)

  async function loadCafes(area: Parameters<typeof findCafes>[0]) {
    setBusy(true)
    setStatus('Finding cafés…')
    try {
      const found = await findCafes(area)
      setCafes(found)
      setStatus(found.length ? '' : 'No cafés mapped here. Tap the map to drop a pin.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // Start where the check-in already is, otherwise where the user is.
  useEffect(() => {
    if (initial) {
      void loadCafes({ around: initial, radius: 400 })
      return
    }
    setStatus('Getting your location…')
    getPosition()
      .then((pos) => {
        setMe(pos)
        setView({ center: pos, zoom: 17, key: 'me' })
        setZoomedIn(true)
        return loadCafes({ around: pos, radius: 600 })
      })
      .catch((e: Error) => setStatus(`${e.message} You can search instead.`))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep Escape and the back gesture from leaving the form behind the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function onSearch(e: React.FormEvent) {
    e.preventDefault()
    // React bubbles events through portals, so keep this from submitting the check-in form too.
    e.stopPropagation()
    if (!query.trim()) return
    setBusy(true)
    setStatus('')
    try {
      const found = await searchPlaces(query.trim(), me ?? (zoomedIn ? view.center : undefined))
      setResults(found)
      if (found.length === 0) setStatus('No matches. Try adding the town or street.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function chooseResult(p: Place) {
    setResults(null)
    setSelected(p)
    setView({ center: p, zoom: 17, key: `r-${p.lat},${p.lon}` })
    setZoomedIn(true)
    void loadCafes({ around: p, radius: 400 })
  }

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = cafes.map((c) => ({ id: c.osm, lat: c.lat, lon: c.lon, kind: 'cafe', label: c.name }))
    if (me) list.push({ id: 'me', ...me, kind: 'me', label: 'You' })
    if (selected) list.push({ id: 'selected', lat: selected.lat, lon: selected.lon, kind: 'selected', label: selected.name })
    return list
  }, [cafes, me, selected])

  return createPortal(
    <div className="picker" role="dialog" aria-modal="true" aria-label="Tag a place">
      <div className="picker-top">
        <form className="picker-search" onSubmit={onSearch}>
          <input
            type="search"
            placeholder="Search a café, street or town"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
          />
          <button type="submit" className="btn" disabled={busy}>
            Search
          </button>
        </form>
        {results && results.length > 0 && (
          <ul className="picker-results">
            {results.map((r) => (
              <li key={`${r.osm}-${r.lat}`}>
                <button type="button" onClick={() => chooseResult(r)}>
                  <strong>{r.name}</strong>
                  <span className="muted">{r.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="picker-map">
        <MapView
          center={view.center}
          zoom={view.zoom}
          viewKey={view.key}
          markers={markers}
          className="map-fill"
          onMarkerClick={(id) => {
            const c = cafes.find((x) => x.osm === id)
            if (c) setSelected(c)
          }}
          onMapClick={(p) => setSelected({ name: pinName.trim() || 'Dropped pin', ...p, address: '', osm: null })}
          onMoveEnd={(b) => setBounds(b)}
        />
        {zoomedIn && bounds && (
          <button
            type="button"
            className="btn btn-small picker-area"
            disabled={busy}
            onClick={() => loadCafes(bounds)}
          >
            Search this area
          </button>
        )}
        {status && <div className="picker-status">{status}</div>}
      </div>

      <div className="picker-bottom">
        {selected ? (
          <div className="picker-selected">
            <strong>{selected.name}</strong>
            <span className="muted">
              {[selected.address || (selected.osm ? '' : 'Pinned location'), me && formatDistance(distance(me, selected))]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        ) : (
          <span className="muted">Tap a café, or tap the map to drop a pin.</span>
        )}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selected}
            onClick={() => selected && onPick(selected)}
          >
            Use this place
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
