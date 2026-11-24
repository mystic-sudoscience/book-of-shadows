// Computes node positions for the web. Everything is placed explicitly
// (Cytoscape's "preset" layout) so the picture is stable and readable:
//   1 hub  – items fan out around it in petals, one petal per type.
//   2–5    – items shared by several hubs sit between them; items unique
//            to one hub fan out on that hub's outer side.
import { TYPE_ORDER } from './types.js'
import { groupBy } from './util.js'

const GAP = 46 // distance between neighbouring nodes
const HUB_CLEAR = 96 // empty radius around a hub

const typeRank = (t) => {
  const i = TYPE_ORDER.indexOf(t)
  return i === -1 ? 99 : i
}
const byTypeThenName = (a, b) => typeRank(a.type) - typeRank(b.type) || a.name.localeCompare(b.name)

/** Place `list` in rows of arcs between angles a0 and a1, starting at radius r0. Returns {pos, radius}. */
function fillArc(list, a0, a1, r0, gap = GAP) {
  const pos = []
  let r = r0
  let i = 0
  while (i < list.length) {
    const cap = Math.max(1, Math.floor(((a1 - a0) * r) / gap))
    const row = list.slice(i, i + cap)
    const step = (a1 - a0) / row.length
    // Stagger alternate rows slightly so nodes don't line up radially.
    row.forEach((_, j) => {
      const a = a0 + step * (j + 0.5)
      pos.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
    })
    i += cap
    r += gap * 0.85
  }
  return { pos, radius: list.length ? r - gap * 0.85 : r0 }
}

/** Split an angle range into one sector per type (sized by count) and fill each. */
function petals(list, center, a0, a1, r0) {
  const sorted = [...list].sort(byTypeThenName)
  const groups = [...groupBy(sorted, (it) => it.type)].map(([type, items]) => ({ type, items }))
  const span = a1 - a0
  const gap = groups.length > 1 ? Math.min(0.08, (span * 0.15) / groups.length) : 0
  const usable = span - gap * groups.length
  const out = new Map()
  let radius = r0
  let a = a0 + gap / 2
  for (const g of groups) {
    const width = (usable * g.items.length) / sorted.length
    const res = fillArc(g.items, a, a + width, r0)
    g.items.forEach((it, k) => out.set(it.id, { x: center.x + res.pos[k].x, y: center.y + res.pos[k].y }))
    radius = Math.max(radius, res.radius)
    a += width + gap
  }
  return { positions: out, radius }
}

/** Pack `list` into a disc (sunflower spiral) centred on `center`. */
function disc(list, center) {
  const sorted = [...list].sort(byTypeThenName)
  const c = GAP * 0.62
  const golden = Math.PI * (3 - Math.sqrt(5))
  const out = new Map()
  sorted.forEach((it, i) => {
    const r = c * Math.sqrt(i + 0.5)
    const a = i * golden
    out.set(it.id, { x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r })
  })
  return { positions: out, radius: c * Math.sqrt(sorted.length + 0.5) + GAP / 2 }
}

const discRadius = (n) => (n ? GAP * 0.62 * Math.sqrt(n + 0.5) + GAP / 2 : 0)

/**
 * hubs: array of hub ids (1–5)
 * members: array of { item, mask } where bit i of mask means "linked to hub i"
 * Returns Map(id -> {x, y}) including hubs.
 */
export function layoutWeb(hubs, members) {
  const out = new Map()
  const origin = { x: 0, y: 0 }
  if (hubs.length === 1) {
    out.set(hubs[0], origin)
    setAll(out, petals(members.map((m) => m.item), origin, -Math.PI / 2, (3 * Math.PI) / 2, HUB_CLEAR).positions)
    return out
  }

  const groups = new Map([...groupBy(members, (m) => m.mask)].map(([mask, ms]) => [mask, ms.map((m) => m.item)]))
  const n = hubs.length
  const full = (1 << n) - 1
  const single = (i) => groups.get(1 << i) ?? []
  const shared = [...groups.keys()].filter((mask) => mask & (mask - 1)) // two or more bits set
  const sizeOf = (mask) => discRadius(groups.get(mask)?.length ?? 0)
  // How big each unique-to-one-hub fan gets, to keep hubs far enough apart.
  const fanRadius = Math.max(0, ...hubs.map((_, i) => petals(single(i), origin, 0, Math.PI, HUB_CLEAR).radius))

  const hubPos = hubPositions(n, { full: sizeOf(full), pair: Math.max(0, ...shared.filter((m) => m !== full).map(sizeOf)), fanRadius, shared, sizeOf })
  hubs.forEach((h, i) => out.set(h, hubPos[i]))

  // Shared groups: a disc at the centre of the hubs they belong to.
  const discs = shared.map((mask) => ({ mask, r: sizeOf(mask), fixed: mask === full, ...centroid(hubsIn(mask, n).map((i) => hubPos[i])) }))
  if (n === 3) {
    // Push pair groups a little outward so they clear the triple group.
    for (const D of discs) if (!D.fixed) pushOut(D, sizeOf(full) * 0.25)
  } else if (n > 3) {
    separate(discs, hubPos)
  }
  for (const D of discs) setAll(out, disc(groups.get(D.mask), D).positions)

  // Unique groups: a half-circle fan on the side of the hub facing away from the middle.
  hubPos.forEach((hp, i) => {
    const a = Math.atan2(hp.y, hp.x)
    setAll(out, petals(single(i), hp, a - Math.PI / 2, a + Math.PI / 2, HUB_CLEAR).positions)
  })
  return out
}

// --- helpers for layoutWeb ---------------------------------------------------

const setAll = (out, positions) => positions.forEach((p, id) => out.set(id, p))
const onCircle = (r, a) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r })
/** n points on a circle of radius r, the first at the top. */
const polygon = (n, r) => Array.from({ length: n }, (_, i) => onCircle(r, -Math.PI / 2 + (2 * Math.PI * i) / n))
const hubsIn = (mask, n) => Array.from({ length: n }, (_, i) => i).filter((i) => mask & (1 << i))
const centroid = (pts) => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length })

function pushOut(p, by) {
  const len = Math.hypot(p.x, p.y) || 1
  p.x += (p.x / len) * by
  p.y += (p.y / len) * by
}

/** Where the hubs go: a line for two, a triangle for three, a polygon for four or five. */
function hubPositions(n, { full, pair, fanRadius, shared, sizeOf }) {
  if (n === 2) {
    const d = Math.max(260, full + HUB_CLEAR + 40)
    return [{ x: -d, y: 0 }, { x: d, y: 0 }]
  }
  if (n === 3) return polygon(3, Math.max(340, 2 * (full + pair + 50), (pair + HUB_CLEAR + 40) / 0.866, fanRadius * 1.15))
  const area = shared.reduce((s, m) => s + sizeOf(m) ** 2, 0)
  return polygon(n, Math.max(440, fanRadius * 1.15, Math.sqrt(area) * 1.5 + HUB_CLEAR + 60))
}

/** Nudge discs apart until none overlap each other or a hub. Fixed discs don't move. */
function separate(discs, hubPos) {
  for (let iter = 0; iter < 300; iter++) {
    let moved = false
    for (let a = 0; a < discs.length; a++) {
      for (let b = a + 1; b < discs.length; b++) moved = repel(discs[a], discs[b]) || moved
      if (!discs[a].fixed) for (const h of hubPos) moved = clear(discs[a], h, discs[a].r + HUB_CLEAR) || moved
    }
    if (!moved) return
  }
}

/** Push two discs apart if they overlap. Returns whether anything moved. */
function repel(A, B) {
  let dx = B.x - A.x
  let dy = B.y - A.y
  let d = Math.hypot(dx, dy)
  const min = A.r + B.r + 14
  if (d >= min) return false
  if (d < 0.01) {
    // Same centre: separate along a direction derived from the masks.
    ;({ x: dx, y: dy } = onCircle(1, (A.mask * 2.399 + B.mask) % (2 * Math.PI)))
    d = 1
  }
  const push = (min - d) / d
  const wa = A.fixed ? 0 : B.fixed ? 1 : 0.5
  A.x -= dx * push * wa
  A.y -= dy * push * wa
  B.x += dx * push * (1 - wa)
  B.y += dy * push * (1 - wa)
  return true
}

/** Move disc D away from point p until it is at least `min` away. */
function clear(D, p, min) {
  const dx = D.x - p.x
  const dy = D.y - p.y
  const d = Math.hypot(dx, dy) || 1
  if (d >= min) return false
  D.x += (dx / d) * (min - d)
  D.y += (dy / d) * (min - d)
  return true
}

/** Item-centred view: the item in the middle, its properties (and relatives) around it. */
export function layoutFocus(centerId, satellites, linked = []) {
  const out = new Map([[centerId, { x: 0, y: 0 }]])
  // Inner ring: the item's intentions (one roomy ring when it fits, so labels have space).
  const gap = 84
  const r0 = Math.max(170, Math.min(340, (satellites.length * gap) / (2 * Math.PI)))
  const res = fillArc(satellites, -Math.PI / 2, (3 * Math.PI) / 2, r0, gap)
  satellites.forEach((s, i) => out.set(s.id, res.pos[i]))
  // Outer ring: items it is linked with, in one petal per type.
  if (linked.length) {
    const inner = satellites.length ? res.radius : 0
    petals(linked, { x: 0, y: 0 }, -Math.PI / 2, (3 * Math.PI) / 2, inner + 120).positions.forEach((p, id) => out.set(id, p))
  }
  return out
}
