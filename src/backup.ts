import { db, type CoffeeEntry } from './db'
import { blobToDataUrl, dataUrlToBlob } from './image'

interface BackupFile {
  app: 'brewlog'
  version: 1
  exportedAt: string
  coffees: (Omit<CoffeeEntry, 'photo' | 'thumb'> & { photo: string | null; thumb: string | null })[]
}

export async function exportBackup(): Promise<Blob> {
  const coffees = await db.coffees.toArray()
  const data: BackupFile = {
    app: 'brewlog',
    version: 1,
    exportedAt: new Date().toISOString(),
    coffees: await Promise.all(
      coffees.map(async (c) => ({
        ...c,
        photo: c.photo ? await blobToDataUrl(c.photo) : null,
        thumb: c.thumb ? await blobToDataUrl(c.thumb) : null,
      })),
    ),
  }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

/** Adds the entries from a backup file. Returns the number imported. */
export async function importBackup(file: File): Promise<number> {
  const data = JSON.parse(await file.text()) as BackupFile
  if (data.app !== 'brewlog' || !Array.isArray(data.coffees)) {
    throw new Error('This does not look like a Brewlog backup file.')
  }
  const entries: CoffeeEntry[] = await Promise.all(
    data.coffees.map(async ({ id: _id, ...c }) => ({
      ...c,
      place: c.place ?? null,
      photo: c.photo ? await dataUrlToBlob(c.photo) : null,
      thumb: c.thumb ? await dataUrlToBlob(c.thumb) : null,
    })),
  )
  await db.coffees.bulkAdd(entries)
  return entries.length
}
