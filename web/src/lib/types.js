// Display metadata for each collection (item type).

export const GROUPS = [
  { id: 'materials', label: 'Materials', shape: 'ellipse' },
  { id: 'celestial', label: 'Celestial & timing', shape: 'diamond' },
  { id: 'symbols', label: 'Symbols', shape: 'round-rectangle' },
]

export const TYPES = {
  plants: { label: 'Plants', group: 'materials', color: '#5fa35a' },
  crystals: { label: 'Crystals', group: 'materials', color: '#9b7fd4' },
  metals: { label: 'Metals', group: 'materials', color: '#9e9a92' },
  planets: { label: 'Planets', group: 'celestial', color: '#e0a63a' },
  moon: { label: 'Moon', group: 'celestial', color: '#8fa3c4' },
  zodiac: { label: 'Zodiac', group: 'celestial', color: '#d9704f' },
  weekdays: { label: 'Weekdays', group: 'celestial', color: '#b8862f' },
  times: { label: 'Times of day', group: 'celestial', color: '#5aa0c8' },
  seasons: { label: 'Seasons', group: 'celestial', color: '#8fae4a' },
  holidays: { label: 'Holidays', group: 'celestial', color: '#d4547a' },
  colors: { label: 'Colors', group: 'symbols', color: '#888888' },
  elements: { label: 'Elements', group: 'symbols', color: '#3f9e9a' },
  tarot: { label: 'Tarot', group: 'symbols', color: '#b5643c' },
  numbers: { label: 'Numbers', group: 'symbols', color: '#7d8fd9' },
  directions: { label: 'Directions', group: 'symbols', color: '#8a9a6a' },
  chakras: { label: 'Chakras', group: 'symbols', color: '#c96fc2' },
}

export const TYPE_ORDER = Object.keys(TYPES)

export function typeInfo(type) {
  return TYPES[type] ?? { label: type, group: 'symbols', color: '#888888' }
}

export function shapeOf(type) {
  const group = GROUPS.find((g) => g.id === typeInfo(type).group)
  return group?.shape ?? 'ellipse'
}

// Real swatches for items in the colors collection.
const SWATCHES = {
  aqua: '#4fd1c5', black: '#1b1b1f', blue: '#3b6fd6', brown: '#7a4e2d',
  copper: '#b87333', crimson: '#b0102e', gold: '#d4af37', gray: '#8a8a8a',
  green: '#3c9a4a', indigo: '#4b3a9e', lavender: '#b6a3e0', mauve: '#b784a7',
  orange: '#e8822a', peach: '#f5b48a', pink: '#ef8fb4', purple: '#7d3c98',
  red: '#d32f2f', rose: '#e05a7a', silver: '#c0c0c0', turquoise: '#30c5b5',
  violet: '#8f5bd6', white: '#f5f5f5', yellow: '#f2d03b',
  'blue-green': '#1f9e8f', 'yellow-green': '#9acd32',
}

function mix(hex, target, amount) {
  const a = parseInt(hex.slice(1), 16)
  const b = parseInt(target.slice(1), 16)
  const ch = (n, s) => (n >> s) & 255
  const out = [16, 8, 0].map((s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * amount))
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('')
}

/** Fill color for a node: a real swatch for colors, otherwise the type's color. */
export function itemColor(item) {
  if (item.type !== 'colors') return typeInfo(item.type).color
  const [base, shade] = item.id.slice('colors:'.length).split('/')
  if (shade && SWATCHES[shade]) return SWATCHES[shade]
  const color = SWATCHES[base] ?? '#888888'
  if (shade === 'dark') return mix(color, '#000000', 0.4)
  if (shade === 'pale' || shade === 'light') return mix(color, '#ffffff', 0.45)
  return color
}
