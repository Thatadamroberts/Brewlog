import Dexie, { type EntityTable } from 'dexie'

/** A spot on the map a check-in is tagged with. */
export interface Place {
  name: string
  lat: number
  lon: number
  address: string
  /** OpenStreetMap id such as "node/123", or null for a dropped pin */
  osm: string | null
}

export interface CoffeeEntry {
  id?: number
  /** Name of the coffee or bean, e.g. "Kochere Natural" */
  name: string
  /** What was drunk or brewed, e.g. Espresso, Flat white, Pour over */
  drinkType: string

  // Bean information
  roaster: string
  origin: string
  region: string
  producer: string
  variety: string
  process: string
  roastLevel: string
  roastDate: string
  tastingNotes: string

  // Where it was obtained
  sourceType: string
  sourceName: string
  sourceLocation: string
  price: number | null
  currency: string
  quantity: string
  place: Place | null

  rating: number | null
  notes: string
  photo: Blob | null
  thumb: Blob | null

  /** Date of the check-in (YYYY-MM-DD) */
  date: string
  createdAt: number
  updatedAt: number
}

export type CoffeeDraft = Omit<CoffeeEntry, 'id' | 'createdAt' | 'updatedAt'>

export const db = new Dexie('brewlog') as Dexie & {
  coffees: EntityTable<CoffeeEntry, 'id'>
}

db.version(1).stores({
  coffees: '++id, date, name, roaster, origin, drinkType, sourceName, rating, createdAt',
})
db.version(2).upgrade((tx) =>
  tx
    .table('coffees')
    .toCollection()
    .modify((c) => {
      c.place ??= null
    }),
)

export function emptyDraft(): CoffeeDraft {
  return {
    name: '',
    drinkType: '',
    roaster: '',
    origin: '',
    region: '',
    producer: '',
    variety: '',
    process: '',
    roastLevel: '',
    roastDate: '',
    tastingNotes: '',
    sourceType: '',
    sourceName: '',
    sourceLocation: '',
    price: null,
    currency: localStorageGet('brewlog.currency') ?? 'USD',
    quantity: '',
    place: null,
    rating: null,
    notes: '',
    photo: null,
    thumb: null,
    date: today(),
  }
}

export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function saveCoffee(draft: CoffeeDraft, id?: number): Promise<number> {
  const now = Date.now()
  localStorageSet('brewlog.currency', draft.currency)
  if (id != null) {
    await db.coffees.update(id, { ...draft, updatedAt: now })
    return id
  }
  return db.coffees.add({ ...draft, createdAt: now, updatedAt: now }) as Promise<number>
}

function localStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function localStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not important if this fails; it only remembers the last currency used.
  }
}
