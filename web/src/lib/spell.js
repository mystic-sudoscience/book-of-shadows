// What a spell's components add up to: correspondences, chakra/element balance,
// and suggestions for what to add next.
import { items, weekdayForPlanet, itemsById, matchingProps } from './data.js'
import { groupBy } from './util.js'

// Correspondence kinds and the collection each names. The data build already turns
// fields like `planet` and `chakra` into `correspondences`, so those are all we read.
export const KIND_COLLECTION = { planet: 'planets', element: 'elements', 'zodiac sign': 'zodiac', chakra: 'chakras', holiday: 'holidays', 'moon phase': 'moon', day: 'weekdays' }
const KIND_OF = Object.fromEntries(Object.entries(KIND_COLLECTION).map(([k, c]) => [c, k]))

export const CHAKRAS = ['root', 'sacral', 'solar plexus', 'heart', 'throat', 'third eye', 'crown']
export const ELEMENTS = ['earth', 'air', 'fire', 'water']

/** [kind, value] pairs for an item: what it names, and what it is itself (a planet counts as that planet). */
export function correspondences(item) {
  const out = []
  for (const [coll, kind] of Object.entries(KIND_OF)) for (const c of item.correspondences?.[coll] ?? []) out.push([kind, c.name])
  const self = item.id.slice(item.type.length + 1)
  if (KIND_OF[item.type] && (item.type !== 'moon' || item.fields.type === 'phase')) out.push([KIND_OF[item.type], self])
  return out
}

/** The chakras or elements an item touches ("all" means every chakra). */
export function touches(item, kind, all) {
  const vals = new Set(correspondences(item).filter(([k]) => k === kind).map(([, v]) => v))
  if (vals.has('all')) return new Set(all)
  return new Set([...vals].filter((v) => all.includes(v)))
}

/** The item id for a correspondence value, e.g. ('planet', 'venus') -> 'planets:venus'. */
const valueId = (kind, value) => `${KIND_COLLECTION[kind]}:${value}`

/** For each chakra/element: the spell items that cover it. */
export function coverage(spellItems, kind, all) {
  return all.map((v) => ({ value: v, id: valueId(kind, v), items: spellItems.filter((it) => touches(it, kind, all).has(v)).map((it) => it.name) }))
}

/** Correspondences shared by two or more spell items, most shared first. */
export function sharedCorrespondences(spellItems) {
  const tally = new Map()
  for (const it of spellItems) {
    const pairs = new Map(correspondences(it).map(([kind, value]) => [`${kind}\u0000${value}`, { kind, value }]))
    for (const [key, { kind, value }] of pairs) {
      const id = valueId(kind, value)
      tally.set(key, { kind, value, n: (tally.get(key)?.n ?? 0) + 1, id: itemsById.has(id) ? id : null })
    }
  }
  return [...tally.values()].filter((t) => t.n >= 2).sort((a, b) => b.n - a.n || a.kind.localeCompare(b.kind))
}

/** The weekday ruled by the planet most of the spell shares. */
export function bestDay(shared) {
  const planet = shared.find((s) => s.kind === 'planet')
  if (!planet) return null
  const day = weekdayForPlanet.get(planet.value)
  return day ? { planet: planet.value, day } : null
}

/**
 * Items to add: they match the spell's intentions (most intentions first), and get a
 * boost for covering a chakra or element the spell is missing. Grouped by type.
 */
export function suggestions(spellItems, intentions, exact, { perType = 4, types = null } = {}) {
  if (!intentions.length) return []
  const inSpell = new Set(spellItems.map((it) => it.id))
  const missingChakras = CHAKRAS.filter((c) => !spellItems.some((it) => touches(it, 'chakra', CHAKRAS).has(c)))
  const missingElements = ELEMENTS.filter((e) => !spellItems.some((it) => touches(it, 'element', ELEMENTS).has(e)))
  const scored = []
  for (const it of items) {
    if (inSpell.has(it.id) || it.parent || (types && !types.includes(it.type))) continue
    const matches = intentions.filter((a) => matchingProps(it, a, exact).length)
    if (!matches.length) continue
    const fills = [
      ...missingElements.filter((e) => touches(it, 'element', ELEMENTS).has(e)),
      ...missingChakras.filter((c) => touches(it, 'chakra', CHAKRAS).has(c)).map((c) => `${c} chakra`),
    ]
    // More intentions matched beats everything; then filling gaps; then fewer, more specific properties.
    const score = matches.length * 100 + Math.min(fills.length, 3) * 10 - Math.min(it.properties.length, 60) / 10
    scored.push({ item: it, matches, fills, score })
  }
  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
  return [...groupBy(scored, (s) => s.item.type)]
    .map(([type, list]) => ({ type, list: list.slice(0, perType) }))
    .sort((a, b) => b.list[0].score - a.list[0].score)
}
