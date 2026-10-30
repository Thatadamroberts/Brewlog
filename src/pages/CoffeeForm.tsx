import { useLiveQuery } from 'dexie-react-hooks'
import { cloneElement, useEffect, useId, useRef, useState, type ReactElement } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useObjectUrl } from '../components/BlobImage'
import { MapPicker } from '../components/MapPicker'
import { RatingInput } from '../components/Rating'
import { db, emptyDraft, saveCoffee, today, type CoffeeDraft, type Place } from '../db'
import { mapsUrl, placeFromParam } from '../geo'
import { processPhoto } from '../image'
import { CURRENCIES, DRINK_TYPES, PROCESSES, ROAST_LEVELS, SOURCE_TYPES } from '../options'

export function CoffeeForm() {
  const params = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const editId = params.id ? Number(params.id) : undefined
  const copyFrom = search.get('from')
  const placeParam = search.get('place')

  const [draft, setDraft] = useState<CoffeeDraft | null>(() => {
    if (editId || copyFrom) return null
    // "Check in here" from the Nearby screen arrives with a place.
    const place = placeFromParam(placeParam)
    return place ? withPlace(emptyDraft(), place) : emptyDraft()
  })
  const [picking, setPicking] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const photoUrl = useObjectUrl(draft?.photo)

  // Load the entry being edited, or the one being logged again.
  useEffect(() => {
    const sourceId = editId ?? (copyFrom ? Number(copyFrom) : undefined)
    if (sourceId == null) return
    db.coffees.get(sourceId).then((c) => {
      if (!c) return setDraft(emptyDraft())
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = c
      // "Log again" keeps the bean and source details but starts a fresh check-in.
      setDraft(editId ? rest : { ...rest, date: today(), rating: null, notes: '', photo: null, thumb: null })
    })
  }, [editId, copyFrom])

  // Suggestions from earlier entries, so roasters and shops only need typing once.
  const suggestions = useLiveQuery(async () => {
    const all = await db.coffees.toArray()
    const uniq = (f: (c: (typeof all)[number]) => string) => [...new Set(all.map(f).filter(Boolean))].sort()
    return {
      roaster: uniq((c) => c.roaster),
      origin: uniq((c) => c.origin),
      variety: uniq((c) => c.variety),
      sourceName: uniq((c) => c.sourceName),
      sourceLocation: uniq((c) => c.sourceLocation),
    }
  }, [])

  if (!draft) return null

  const set = <K extends keyof CoffeeDraft>(key: K, value: CoffeeDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  const text = (key: keyof CoffeeDraft) => ({
    value: (draft[key] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(key, e.target.value as never),
  })

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    setError('')
    try {
      const { photo, thumb } = await processPhoto(file)
      setDraft((d) => (d ? { ...d, photo, thumb } : d))
    } catch {
      setError('Could not read that image. Try a JPEG or PNG.')
    } finally {
      setPhotoBusy(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    if (!draft.name.trim() && !draft.roaster.trim()) {
      setError('Give the coffee a name or a roaster.')
      return
    }
    const id = await saveCoffee(draft, editId)
    navigate(`/coffee/${id}`, { replace: true })
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <h1>{editId ? 'Edit coffee' : 'Check in a coffee'}</h1>

      <div className="photo-picker">
        {photoUrl ? (
          <img src={photoUrl} alt="Coffee" />
        ) : (
          <button type="button" className="photo-empty" onClick={() => fileInput.current?.click()}>
            {photoBusy ? 'Processing…' : '📷 Add a photo'}
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            onPhoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {photoUrl && (
          <div className="photo-actions">
            <button type="button" className="btn btn-small" onClick={() => fileInput.current?.click()}>
              Change
            </button>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => setDraft({ ...draft, photo: null, thumb: null })}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <fieldset className="panel">
        <legend>The coffee</legend>
        <Field label="Coffee name">
          <input {...text('name')} placeholder="e.g. Kochere Natural, House Blend" autoFocus={!editId} />
        </Field>
        <Field label="Type of coffee">
          <Select {...text('drinkType')} options={DRINK_TYPES} />
        </Field>
        <Field label="Date">
          <input type="date" {...text('date')} required />
        </Field>
        <Field label="Rating">
          <RatingInput value={draft.rating} onChange={(v) => set('rating', v)} />
        </Field>
      </fieldset>

      <fieldset className="panel">
        <legend>Bean information</legend>
        <Field label="Roaster">
          <Suggest listId="roaster" {...text('roaster')} options={suggestions?.roaster} />
        </Field>
        <div className="row">
          <Field label="Origin country">
            <Suggest listId="origin" {...text('origin')} options={suggestions?.origin} placeholder="e.g. Ethiopia" />
          </Field>
          <Field label="Region">
            <input {...text('region')} placeholder="e.g. Yirgacheffe" />
          </Field>
        </div>
        <Field label="Farm / producer">
          <input {...text('producer')} />
        </Field>
        <div className="row">
          <Field label="Variety">
            <Suggest listId="variety" {...text('variety')} options={suggestions?.variety} placeholder="e.g. Heirloom" />
          </Field>
          <Field label="Process">
            <Select {...text('process')} options={PROCESSES} />
          </Field>
        </div>
        <div className="row">
          <Field label="Roast level">
            <Select {...text('roastLevel')} options={ROAST_LEVELS} />
          </Field>
          <Field label="Roast date">
            <input type="date" {...text('roastDate')} />
          </Field>
        </div>
        <Field label="Tasting notes">
          <input {...text('tastingNotes')} placeholder="e.g. blueberry, jasmine, cocoa" />
        </Field>
      </fieldset>

      <fieldset className="panel">
        <legend>Where I got it</legend>
        <div className="place-tag">
          {draft.place ? (
            <>
              <div className="place-tag-info">
                <span aria-hidden="true">📍</span>
                <div>
                  <strong>{draft.place.name}</strong>
                  <a href={mapsUrl(draft.place)} target="_blank" rel="noreferrer" className="muted">
                    {draft.place.address || 'Open in Maps'}
                  </a>
                </div>
              </div>
              <div className="photo-actions">
                <button type="button" className="btn btn-small" onClick={() => setPicking(true)}>
                  Change
                </button>
                <button type="button" className="btn btn-small" onClick={() => set('place', null)}>
                  Remove
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="btn place-tag-add" onClick={() => setPicking(true)}>
              📍 Tag a place on the map
            </button>
          )}
        </div>
        <div className="row">
          <Field label="Place / seller">
            <Suggest listId="sourceName" {...text('sourceName')} options={suggestions?.sourceName} />
          </Field>
          <Field label="Kind of place">
            <Select {...text('sourceType')} options={SOURCE_TYPES} />
          </Field>
        </div>
        <Field label="Location">
          <Suggest
            listId="sourceLocation"
            {...text('sourceLocation')}
            options={suggestions?.sourceLocation}
            placeholder="City, address or website"
          />
        </Field>
        <div className="row">
          <Field label="Price">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={draft.price ?? ''}
              onChange={(e) => set('price', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Currency">
            <select {...text('currency')}>
              {[...new Set([draft.currency, ...CURRENCIES])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <input {...text('quantity')} placeholder="250 g, 1 cup" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="panel">
        <legend>Notes</legend>
        <textarea {...text('notes')} aria-label="Notes" rows={4} placeholder="How was it? Brew recipe, grind, who you were with…" />
      </fieldset>

      {picking && (
        <MapPicker
          initial={draft.place}
          pinName={draft.sourceName}
          onClose={() => setPicking(false)}
          onPick={(place) => {
            setDraft((d) => (d ? withPlace(d, place) : d))
            setPicking(false)
          }}
        />
      )}

      {error && <p className="error">{error}</p>}
      <div className="actions sticky">
        <button type="button" className="btn" onClick={() => navigate(-1)}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={photoBusy}>
          {editId ? 'Save changes' : 'Check in'}
        </button>
      </div>
    </form>
  )
}

/** Tag a place and fill in the source fields it can answer, without overwriting the user's own text. */
function withPlace(d: CoffeeDraft, place: Place): CoffeeDraft {
  const prev = d.place
  const replaceable = (current: string, fromPrev: string | undefined) => !current || current === fromPrev
  return {
    ...d,
    place,
    sourceName: replaceable(d.sourceName, prev?.name) ? place.name : d.sourceName,
    sourceLocation: replaceable(d.sourceLocation, prev?.address) ? place.address : d.sourceLocation,
    sourceType: !d.sourceType && place.osm ? 'Café' : d.sourceType,
  }
}

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  )
}

function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) {
  const value = String(props.value ?? '')
  return (
    <select {...props}>
      <option value="">—</option>
      {value && !options.includes(value) && <option>{value}</option>}
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  )
}

function Suggest({
  listId,
  options,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { listId: string; options?: string[] }) {
  return (
    <>
      <input {...props} list={`list-${listId}`} autoComplete="off" />
      <datalist id={`list-${listId}`}>
        {options?.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  )
}
