// The current view lives in the URL hash, so browser back/forward walks the
// exploration history and any view can be bookmarked or shared.
//   #/                      the spell (home)
//   #/explore               explorer start screen
//   #/i/love/money          web for up to five hubs: intentions, or items as
//   #/i/love/@crystals%3Ajet  '@' + item id
//   #/item/plants%3Arose    web centred on one item
//   #/spell                 web of the current spell's components

export const MAX_INTENTIONS = 5

/** Hubs that are items are written '@<item id>'; intentions never start with '@'. */
export const isItemHub = (hub) => hub.startsWith('@')
export const itemHub = (id) => '@' + id

export function parseHash(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  if (parts[0] === 'i' && parts.length > 1) return { mode: 'intentions', intentions: parts.slice(1, 1 + MAX_INTENTIONS) }
  if (parts[0] === 'item' && parts[1]) return { mode: 'item', item: parts[1] }
  if (parts[0] === 'spell') return { mode: 'spell' }
  if (parts[0] === 'explore') return { mode: 'explore' }
  return { mode: 'home' }
}

export function intentionsHash(list) {
  return list.length ? '#/i/' + list.map(encodeURIComponent).join('/') : '#/explore'
}

/** Views that belong to the Spell tab; everything else is Explore. */
export const isSpellRoute = (route) => route.mode === 'home' || route.mode === 'spell'

export function itemHash(id) {
  return '#/item/' + encodeURIComponent(id)
}

export function go(hash) {
  if (location.hash !== hash) location.hash = hash
}
