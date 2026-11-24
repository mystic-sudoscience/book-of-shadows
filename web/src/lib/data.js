// Loads the generated correspondence data and builds lookup indexes.
import raw from './data.json'
import { load, save } from './storage.js'
import { groupBy } from './util.js'

// 'full': every property from every source. 'focused': each item's `core properties`
// (falls back to the full list where none were picked). Indexes are built once, so
// switching modes reloads the page.
export const MODES = ['full', 'focused']
export const mode = MODES.includes(load('spellweb.mode', 'full')) ? load('spellweb.mode', 'full') : 'full'
export function setMode(next) {
  if (next === mode) return
  save('spellweb.mode', next)
  location.reload()
}

export const items = raw.items
if (mode === 'focused') {
  for (const it of items) {
    const core = new Set(it.core ?? it.properties)
    it.fullCount = it.properties.length
    it.properties = it.properties.filter((p) => core.has(p))
    it.own = it.own.filter((p) => core.has(p))
  }
}
export const bibliography = raw.bibliography
export const itemsById = new Map(items.map((it) => [it.id, it]))

/** intention -> items that list it in their properties */
export const byIntention = groupBy(items, (it) => it.properties)

/** Every intention used by at least one item, most common first then A–Z. */
export const intentions = [...byIntention.keys()].sort(
  (a, b) => byIntention.get(b).length - byIntention.get(a).length || a.localeCompare(b),
)

export function countFor(intention) {
  return byIntention.get(intention)?.length ?? 0
}

// --- intention groups (data/intention_groups.yml) ------------------------
export const groups = raw.groups ?? {}

/** member -> the groups it is listed under */
export const groupsOf = new Map(
  [...groupBy(Object.entries(groups), ([, members]) => members)].map(([m, entries]) => [m, entries.map(([group]) => group)]),
)

const relatedCache = new Map()
/** The intention plus every more specific wording under it (following nested groups). */
export function relatedTo(intention) {
  if (relatedCache.has(intention)) return relatedCache.get(intention)
  const out = new Set([intention])
  const stack = [intention]
  while (stack.length) {
    for (const m of groups[stack.pop()] ?? []) {
      if (!out.has(m)) {
        out.add(m)
        stack.push(m)
      }
    }
  }
  relatedCache.set(intention, out)
  return out
}

/** Items for an intention: exact wording only, or including its group. */
export function itemsFor(intention, exact = false) {
  if (exact) return byIntention.get(intention) ?? []
  const seen = new Map()
  for (const i of relatedTo(intention)) for (const it of byIntention.get(i) ?? []) seen.set(it.id, it)
  return [...seen.values()]
}

const groupCountCache = new Map()
export function groupCountFor(intention) {
  if (!groupCountCache.has(intention)) groupCountCache.set(intention, itemsFor(intention).length)
  return groupCountCache.get(intention)
}

/** Which of an item's properties put it under `intention` (empty if none). */
export function matchingProps(item, intention, exact = false) {
  if (exact) return item.properties.includes(intention) ? [intention] : []
  const rel = relatedTo(intention)
  return item.properties.filter((p) => rel.has(p))
}

// Fields whose values name items in another collection (defined once, in build_web_data.py).
export const FIELD_LINKS = raw.fieldLinks ?? {}

/** Split a field value ("venus, mercury" or a list) into separate strings. */
export function splitValues(value) {
  const list = Array.isArray(value) ? value : [value]
  return list.flatMap((v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()) : [v])).filter((v) => v !== '')
}

/** The item a field value refers to, if there is one. */
export function linkedItem(field, value) {
  const collection = FIELD_LINKS[field]
  if (!collection || typeof value !== 'string') return null
  return itemsById.get(`${collection}:${value.toLowerCase()}`) ?? null
}

/** Planet -> weekday it rules, from the weekdays collection. */
export const weekdayForPlanet = new Map(
  items.filter((it) => it.type === 'weekdays' && it.fields['ruling planet']).map((it) => [it.fields['ruling planet'], it]),
)

/** True when a plant has a toxicity warning worth showing. */
export function toxicityWarning(item) {
  const t = item.fields?.toxicity
  if (!t || typeof t !== 'object') return null
  const who = [t.humans && 'humans', t.pets && 'pets'].filter(Boolean)
  const notes = Array.isArray(t.notes) ? t.notes : t.notes ? [t.notes] : []
  if (!who.length && !notes.length) return null
  return { who, notes }
}
