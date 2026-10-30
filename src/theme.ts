export type Theme = 'system' | 'light' | 'dark'

const KEY = 'brewlog.theme'
const BAR_COLORS = { light: '#ffffff', dark: '#0b1426' }

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

export function setTheme(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // Still applies for this visit even if it can't be remembered.
  }
  applyTheme(theme)
}

export function applyTheme(theme: Theme = getTheme()) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? BAR_COLORS.dark : BAR_COLORS.light)
}

// Keep the browser bar colour in step when the device switches between light and dark.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme())
