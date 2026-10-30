import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BlobImage } from '../components/BlobImage'
import { RatingDisplay } from '../components/Rating'
import { db, type CoffeeEntry } from '../db'
import { formatDate, formatPrice } from '../options'

type Sort = 'date' | 'rating' | 'price'

export function Feed() {
  const coffees = useLiveQuery(() => db.coffees.orderBy('date').reverse().toArray(), [])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('date')

  const shown = useMemo(() => {
    if (!coffees) return []
    const q = query.trim().toLowerCase()
    const filtered = q
      ? coffees.filter((c) =>
          [c.name, c.roaster, c.origin, c.region, c.drinkType, c.sourceName, c.tastingNotes, c.variety, c.process]
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      : coffees
    if (sort === 'date') return filtered
    const key = (c: CoffeeEntry) => (sort === 'rating' ? c.rating : c.price) ?? -1
    return [...filtered].sort((a, b) => key(b) - key(a))
  }, [coffees, query, sort])

  if (!coffees) return null

  if (coffees.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">☕</div>
        <h2>No coffees yet</h2>
        <p>Log your first cup or bag of beans.</p>
        <Link to="/new" className="btn btn-primary">
          Check in a coffee
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search name, roaster, origin, notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
          <option value="date">Newest</option>
          <option value="rating">Top rated</option>
          <option value="price">Price</option>
        </select>
      </div>
      {shown.length === 0 && <p className="muted center">Nothing matches “{query}”.</p>}
      <ul className="feed">
        {shown.map((c) => (
          <li key={c.id}>
            <Link to={`/coffee/${c.id}`} className="card">
              <BlobImage blob={c.thumb} alt="" className="card-thumb" />
              <div className="card-body">
                <div className="card-title">{c.name || 'Untitled coffee'}</div>
                <div className="card-sub">{[c.roaster, c.origin].filter(Boolean).join(' · ')}</div>
                <div className="card-meta">
                  {c.drinkType && <span className="chip">{c.drinkType}</span>}
                  <RatingDisplay value={c.rating} />
                </div>
                <div className="card-foot">
                  <span>{[c.sourceName, formatDate(c.date)].filter(Boolean).join(' · ')}</span>
                  <span className="price">{formatPrice(c.price, c.currency)}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
