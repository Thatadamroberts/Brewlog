import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CoffeeEntry } from '../db'
import { formatPrice } from '../options'

export function Stats() {
  const coffees = useLiveQuery(() => db.coffees.toArray(), [])
  if (!coffees) return null
  if (coffees.length === 0) return <p className="muted center">Check in some coffees to see your stats.</p>

  const rated = coffees.filter((c) => c.rating != null)
  const avg = rated.length ? rated.reduce((s, c) => s + (c.rating ?? 0), 0) / rated.length : null
  const spendByCurrency = new Map<string, number>()
  for (const c of coffees) {
    if (c.price != null) spendByCurrency.set(c.currency, (spendByCurrency.get(c.currency) ?? 0) + c.price)
  }

  return (
    <div className="stats">
      <h1>Your coffee stats</h1>
      <div className="tiles">
        <Tile label="Check-ins" value={String(coffees.length)} />
        <Tile label="Unique coffees" value={String(countUnique(coffees, (c) => `${c.roaster}|${c.name}`))} />
        <Tile label="Roasters" value={String(countUnique(coffees, (c) => c.roaster))} />
        <Tile label="Origins" value={String(countUnique(coffees, (c) => c.origin))} />
        <Tile label="Average rating" value={avg == null ? '—' : avg.toFixed(2)} />
        {[...spendByCurrency].map(([cur, total]) => (
          <Tile key={cur} label={`Spent (${cur})`} value={formatPrice(total, cur)} />
        ))}
      </div>
      <TopList title="Top origins" items={top(coffees, (c) => c.origin)} />
      <TopList title="Top roasters" items={top(coffees, (c) => c.roaster)} />
      <TopList title="Favourite drinks" items={top(coffees, (c) => c.drinkType)} />
      <TopList title="Where you buy" items={top(coffees, (c) => c.sourceName)} />
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile">
      <div className="tile-value">{value}</div>
      <div className="tile-label">{label}</div>
    </div>
  )
}

function TopList({ title, items }: { title: string; items: [string, number][] }) {
  if (items.length === 0) return null
  const max = items[0][1]
  return (
    <section className="panel">
      <h2>{title}</h2>
      <ul className="bars">
        {items.map(([name, n]) => (
          <li key={name}>
            <span className="bar-label">{name}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="bar-num">{n}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function countUnique(list: CoffeeEntry[], key: (c: CoffeeEntry) => string) {
  return new Set(list.map(key).filter((k) => k && k !== '|')).size
}

function top(list: CoffeeEntry[], key: (c: CoffeeEntry) => string, n = 5): [string, number][] {
  const counts = new Map<string, number>()
  for (const c of list) {
    const k = key(c).trim()
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, n)
}
