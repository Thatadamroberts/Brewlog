export const DRINK_TYPES = [
  'Espresso',
  'Ristretto',
  'Americano',
  'Long black',
  'Macchiato',
  'Cortado',
  'Flat white',
  'Cappuccino',
  'Latte',
  'Mocha',
  'Pour over',
  'Filter / batch brew',
  'AeroPress',
  'French press',
  'Moka pot',
  'Cold brew',
  'Iced coffee',
  'Turkish',
  'Whole beans',
  'Ground coffee',
  'Other',
]

export const PROCESSES = ['Washed', 'Natural', 'Honey', 'Anaerobic', 'Wet-hulled', 'Carbonic maceration', 'Other']

export const ROAST_LEVELS = ['Light', 'Medium-light', 'Medium', 'Medium-dark', 'Dark']

export const SOURCE_TYPES = ['Café', 'Roaster', 'Shop / supermarket', 'Online', 'Gift', 'Other']

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK']

export function formatPrice(price: number | null, currency: string): string {
  if (price == null) return ''
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price)
  } catch {
    return `${price.toFixed(2)} ${currency}`
  }
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
