import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BlobImage } from '../components/BlobImage'
import { RatingDisplay } from '../components/Rating'
import { db } from '../db'
import { formatDate, formatPrice } from '../options'

export function Detail() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const coffee = useLiveQuery(() => db.coffees.get(id), [id], null)

  if (coffee === null) return null
  if (!coffee) return <p className="muted center">That coffee could not be found.</p>

  async function remove() {
    if (!confirm('Delete this coffee? This cannot be undone.')) return
    await db.coffees.delete(id)
    navigate('/')
  }

  const bean: [string, string][] = [
    ['Roaster', coffee.roaster],
    ['Origin', [coffee.region, coffee.origin].filter(Boolean).join(', ')],
    ['Farm / producer', coffee.producer],
    ['Variety', coffee.variety],
    ['Process', coffee.process],
    ['Roast level', coffee.roastLevel],
    ['Roast date', formatDate(coffee.roastDate)],
    ['Tasting notes', coffee.tastingNotes],
  ]
  const source: [string, string][] = [
    ['Where', coffee.sourceName],
    ['Type', coffee.sourceType],
    ['Location', coffee.sourceLocation],
    ['Price', formatPrice(coffee.price, coffee.currency)],
    ['Quantity', coffee.quantity],
  ]

  return (
    <article className="detail">
      {coffee.photo && <BlobImage blob={coffee.photo} alt={coffee.name} className="detail-photo" />}
      <header className="detail-head">
        <h1>{coffee.name || 'Untitled coffee'}</h1>
        <div className="card-meta">
          {coffee.drinkType && <span className="chip">{coffee.drinkType}</span>}
          <RatingDisplay value={coffee.rating} />
        </div>
        <div className="muted">{formatDate(coffee.date)}</div>
      </header>

      <Section title="Bean" rows={bean} />
      <Section title="Where I got it" rows={source} />
      {coffee.notes && (
        <section className="panel">
          <h2>Notes</h2>
          <p className="notes">{coffee.notes}</p>
        </section>
      )}

      <div className="actions">
        <Link to={`/coffee/${id}/edit`} className="btn btn-primary">
          Edit
        </Link>
        <Link to={`/new?from=${id}`} className="btn">
          Log again
        </Link>
        <button type="button" className="btn btn-danger" onClick={remove}>
          Delete
        </button>
      </div>
    </article>
  )
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  const filled = rows.filter(([, v]) => v)
  if (filled.length === 0) return null
  return (
    <section className="panel">
      <h2>{title}</h2>
      <dl>
        {filled.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
