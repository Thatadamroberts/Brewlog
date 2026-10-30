import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { db } from './db'
import './index.css'

// Ask the browser not to evict the local database under storage pressure.
navigator.storage?.persist?.().catch(() => {})
void db.open()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
