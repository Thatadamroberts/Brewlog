import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { exportBackup, importBackup } from '../backup'
import { db, today } from '../db'
import { getTheme, setTheme, type Theme } from '../theme'

export function Settings() {
  const count = useLiveQuery(() => db.coffees.count(), [])
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const [theme, setThemeState] = useState<Theme>(getTheme)

  async function onExport() {
    const blob = await exportBackup()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `brewlog-backup-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function onImport(file: File | undefined) {
    if (!file) return
    try {
      const n = await importBackup(file)
      setMessage(`Imported ${n} coffee${n === 1 ? '' : 's'}.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed.')
    }
  }

  return (
    <div className="settings">
      <h1>Settings</h1>
      <section className="panel">
        <h2>Appearance</h2>
        <div className="segmented" role="group" aria-label="Theme">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={theme === t}
              onClick={() => {
                setTheme(t)
                setThemeState(t)
              }}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Stored on this device only</h2>
        <p>
          Brewlog keeps your {count ?? 0} coffee{count === 1 ? '' : 's'} and photos in this browser's local database.
          Nothing is uploaded. Clearing your browser's site data deletes them, so export a backup from time to time.
        </p>
      </section>
      <section className="panel">
        <h2>Backup</h2>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onExport} disabled={!count}>
            Export backup
          </button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            Import backup
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            onImport(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {message && <p>{message}</p>}
      </section>
    </div>
  )
}
