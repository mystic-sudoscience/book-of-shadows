// The current view lives in the URL hash, so browser back/forward walks the
// exploration history and any view can be bookmarked or shared.
//   #/                      start screen
//   #/i/love/money          web for one to three intentions
//   #/item/plants%3Arose    web centred on one item

export const MAX_INTENTIONS = 3

export function parseHash(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  if (parts[0] === 'i' && parts.length > 1) return { mode: 'intentions', intentions: parts.slice(1, 1 + MAX_INTENTIONS) }
  if (parts[0] === 'item' && parts[1]) return { mode: 'item', item: parts[1] }
  return { mode: 'home' }
}

export function intentionsHash(list) {
  return list.length ? '#/i/' + list.map(encodeURIComponent).join('/') : '#/'
}

export function itemHash(id) {
  return '#/item/' + encodeURIComponent(id)
}

export function go(hash) {
  if (location.hash !== hash) location.hash = hash
}
