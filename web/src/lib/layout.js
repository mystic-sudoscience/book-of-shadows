// Computes node positions for the web. Everything is placed explicitly
// (Cytoscape's "preset" layout) so the picture is stable and readable:
//   1 hub  – items fan out around it in petals, one petal per type.
//   2–3    – items shared by several hubs sit between them; items unique
//            to one hub fan out on that hub's outer side.
import { TYPE_ORDER } from './types.js'

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
  const groups = []
  for (const it of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.type === it.type) last.items.push(it)
    else groups.push({ type: it.type, items: [it] })
  }
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
 * hubs: array of hub ids (1–3)
 * members: array of { item, mask } where bit i of mask means "linked to hub i"
 * Returns Map(id -> {x, y}) including hubs.
 */
export function layoutWeb(hubs, members) {
  const out = new Map()
  if (hubs.length === 1) {
    out.set(hubs[0], { x: 0, y: 0 })
    const res = petals(members.map((m) => m.item), { x: 0, y: 0 }, -Math.PI / 2, (3 * Math.PI) / 2, HUB_CLEAR)
    res.positions.forEach((p, id) => out.set(id, p))
    return out
  }

  const groups = new Map()
  for (const m of members) {
    if (!groups.has(m.mask)) groups.set(m.mask, [])
    groups.get(m.mask).push(m.item)
  }
  const full = (1 << hubs.length) - 1
  const single = (i) => groups.get(1 << i) ?? []
  const shared = [...groups.keys()].filter((mask) => mask & (mask - 1)) // two or more bits set

  // Estimate how big each unique-to-one-hub fan gets, to keep hubs far enough apart.
  const fanRadius = Math.max(0, ...hubs.map((_, i) => petals(single(i), { x: 0, y: 0 }, 0, Math.PI, HUB_CLEAR).radius))

  let hubPos
  if (hubs.length === 2) {
    const d = Math.max(260, discRadius(groups.get(full)?.length ?? 0) + HUB_CLEAR + 40)
    hubPos = [{ x: -d, y: 0 }, { x: d, y: 0 }]
  } else {
    const tri = discRadius(groups.get(full)?.length ?? 0)
    const pair = Math.max(0, ...shared.filter((m) => m !== full).map((m) => discRadius(groups.get(m).length)))
    const R = Math.max(340, 2 * (tri + pair + 50), (pair + HUB_CLEAR + 40) / 0.866, fanRadius * 1.15)
    hubPos = [-90, 30, 150].map((deg) => {
      const a = (deg * Math.PI) / 180
      return { x: Math.cos(a) * R, y: Math.sin(a) * R }
    })
  }
  hubs.forEach((h, i) => out.set(h, hubPos[i]))

  // Shared groups: a disc at the centre of the hubs they belong to.
  for (const mask of shared) {
    const idx = hubs.map((_, i) => i).filter((i) => mask & (1 << i))
    const center = {
      x: idx.reduce((s, i) => s + hubPos[i].x, 0) / idx.length,
      y: idx.reduce((s, i) => s + hubPos[i].y, 0) / idx.length,
    }
    if (hubs.length === 3 && mask !== full) {
      // Push pair groups a little outward so they clear the triple group.
      const len = Math.hypot(center.x, center.y) || 1
      const push = discRadius(groups.get(full)?.length ?? 0) * 0.25
      center.x += (center.x / len) * push
      center.y += (center.y / len) * push
    }
    disc(groups.get(mask), center).positions.forEach((p, id) => out.set(id, p))
  }

  // Unique groups: a half-circle fan on the side of the hub facing away from the middle.
  hubs.forEach((_, i) => {
    const hp = hubPos[i]
    const out_a = Math.atan2(hp.y, hp.x)
    petals(single(i), hp, out_a - Math.PI / 2, out_a + Math.PI / 2, HUB_CLEAR).positions.forEach((p, id) => out.set(id, p))
  })
  return out
}

/** Item-centred view: the item in the middle, its properties (and relatives) around it. */
export function layoutFocus(centerId, satellites) {
  const out = new Map([[centerId, { x: 0, y: 0 }]])
  // One roomy ring when it fits, so labels have space; more rings for long lists.
  const gap = 84
  const r0 = Math.max(170, Math.min(340, (satellites.length * gap) / (2 * Math.PI)))
  const res = fillArc(satellites, -Math.PI / 2, (3 * Math.PI) / 2, r0, gap)
  satellites.forEach((s, i) => out.set(s.id, res.pos[i]))
  return out
}
