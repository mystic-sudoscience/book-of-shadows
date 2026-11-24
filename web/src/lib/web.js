// Builds the graph (nodes, edges, layout) for each kind of view. Pure functions:
// they take items and settings and return { nodes, edges, counts, ... }.
import { itemsById, itemsFor, relatedTo, countFor } from './data.js'
import { itemColor, shapeOf } from './types.js'
import { layoutWeb, layoutFocus } from './layout.js'
import { isItemHub } from './route.js'

// --- members -------------------------------------------------------------

/** An intention as a graph member (it isn't an item, but sits in the web like one). */
export const intentionMember = (name) => ({ id: 'intent:' + name, type: 'intention', name })
const isIntention = (member) => member.type === 'intention'

/** Items an item names in its correspondences, plus items that name it. */
export function linkedItems(item) {
  return [...new Set([...item.links, ...item.linkedFrom])].map((id) => itemsById.get(id)).filter(Boolean)
}

/** What an item hub brings into a web: its intentions and its linked items. */
export const itemNeighbours = (item) => [...item.properties.map(intentionMember), ...linkedItems(item)]

export const bitCount = (mask) => mask.toString(2).replaceAll('0', '').length

/**
 * Gather each hub's members into one map, recording which hubs each belongs to as a bitmask.
 * A member that is itself a hub becomes a hub-to-hub link instead.
 */
export function collectMembers(hubIds, sources) {
  const hubIndex = new Map(hubIds.map((id, i) => [id, i]))
  const members = new Map()
  const hubLinks = new Map()
  sources.forEach((source, i) => {
    for (const node of source) {
      const j = hubIndex.get(node.id)
      if (j !== undefined) {
        if (j !== i) hubLinks.set(`${Math.min(i, j)}:${Math.max(i, j)}`, [Math.min(i, j), Math.max(i, j)])
        continue
      }
      const m = members.get(node.id) ?? { item: node, mask: 0 }
      m.mask |= 1 << i
      members.set(node.id, m)
    }
  })
  return { members: [...members.values()], hubLinks: [...hubLinks.values()] }
}

/** Items per type (intentions aren't a type and don't count). */
export function countTypes(list) {
  const counts = {}
  for (const it of list) if (!isIntention(it)) counts[it.type] = (counts[it.type] ?? 0) + 1
  return counts
}

// --- nodes and edges -----------------------------------------------------

export const itemNode = (item, { kind = 'item', size = 16, inSpell = false, ...rest } = {}) => ({
  id: item.id,
  itemId: item.id,
  label: item.name,
  name: item.name,
  kind,
  color: itemColor(item),
  shape: shapeOf(item.type),
  size,
  inSpell,
  ...rest,
})

export const intentionNode = (name, { size = 14, label = name } = {}) => ({ id: 'intent:' + name, name, label, kind: 'intention', shape: 'ellipse', size })

const withPos = (node, pos) => ({ ...node, ...pos.get(node.id) })

/** A hub-and-members web: hubs placed by layoutWeb, members sized by how many hubs they share. */
function hubWeb({ hubIds, hubNodes, sources, enabled, minShared = 1, memberNode, colorEdges = true }) {
  const { members, hubLinks } = collectMembers(hubIds, sources)
  const kept = members.filter((m) => bitCount(m.mask) >= minShared)
  const on = new Set(enabled)
  const shown = kept.filter((m) => isIntention(m.item) || on.has(m.item.type))
  const pos = layoutWeb(hubIds, shown)
  const full = (1 << hubIds.length) - 1
  const nodes = [...hubNodes, ...shown.map((m) => memberNode(m.item, bitCount(m.mask) - 1))].map((n) => withPos(n, pos))
  const edges = [
    ...shown.flatMap(({ item, mask }) =>
      hubIds.flatMap((h, i) => (mask & (1 << i) ? [{ id: `${h}>${item.id}`, source: h, target: item.id, ...(colorEdges ? { hub: i } : {}) }] : [])),
    ),
    ...hubLinks.map(([a, b]) => ({ id: `hub${a}:${b}`, source: hubIds[a], target: hubIds[b], link: 1 })),
  ]
  return {
    nodes,
    edges,
    counts: countTypes(kept.map((m) => m.item)),
    total: kept.length,
    shown: shown.length,
    sharedAll: hubIds.length > 1 ? shown.filter((m) => m.mask === full).length : 0,
  }
}

// --- views -----------------------------------------------------------------

/**
 * Explorer web for up to five hubs. Intention hubs pull in the items that have them;
 * item hubs ('@<id>') pull in their intentions and linked items.
 */
export function intentionWeb(hubs, { exact, enabled, spellSet }) {
  const hubItem = (h) => (isItemHub(h) ? itemsById.get(h.slice(1)) : null)
  const hubIds = hubs.map((h) => (isItemHub(h) ? h.slice(1) : 'intent:' + h))
  const sources = hubs.map((h) => (hubItem(h) ? itemNeighbours(hubItem(h)) : itemsFor(h, exact)))
  // An item hub's intention also counts toward an intention hub it falls under.
  hubs.forEach((h, i) => {
    if (hubItem(h)) return
    const rel = exact ? new Set([h]) : relatedTo(h)
    const extra = sources.flatMap((s, j) => (j !== i && hubItem(hubs[j]) ? s.filter((m) => isIntention(m) && rel.has(m.name)) : []))
    sources[i] = [...sources[i], ...extra]
  })
  const hubNodes = hubs.map((h, i) => {
    const it = hubItem(h)
    return it
      ? itemNode(it, { kind: 'hub', hub: i, size: 64, inSpell: spellSet.has(it.id) })
      : { ...intentionNode(h, { size: 64 }), kind: 'hub', hub: i }
  })
  const memberNode = (item, extraHubs) =>
    isIntention(item) ? intentionNode(item.name, { size: 14 + 5 * extraHubs }) : itemNode(item, { size: 16 + 5 * extraHubs, inSpell: spellSet.has(item.id) })
  return hubWeb({ hubIds, hubNodes, sources, enabled, memberNode })
}

/** The spell's components as hubs, with what at least two of them share between them. */
export function spellWeb(spellItems, { enabled, starred = [] }) {
  const star = new Set(starred)
  const hubNodes = spellItems.map((it) => itemNode(it, { kind: 'hub', size: 56, inSpell: true }))
  const memberNode = (item, extraHubs) => {
    const size = 14 + 5 * extraHubs
    return isIntention(item) ? intentionNode(item.name, { size, label: (star.has(item.name) ? '★ ' : '') + item.name }) : itemNode(item, { size })
  }
  return {
    ...hubWeb({
      hubIds: spellItems.map((it) => it.id),
      hubNodes,
      sources: spellItems.map(itemNeighbours),
      enabled,
      minShared: spellItems.length > 1 ? 2 : 1,
      memberNode,
      colorEdges: false,
    }),
    spell: true,
  }
}

/** One item in the middle: its relatives and intentions around it, linked items further out. */
export function itemView(item, { enabled, spellSet }) {
  const relatives = [item.parent, ...item.children].filter(Boolean).map((id) => itemsById.get(id))
  const sats = [
    ...relatives.map((r) => ({ ...itemNode(r, { size: 20, inSpell: spellSet.has(r.id) }), relation: true })),
    ...item.properties.map((p) => intentionNode(p, { size: Math.round(10 + 2.5 * Math.log2(countFor(p) + 1)) })),
  ]
  const satIds = new Set(sats.map((s) => s.id))
  const linkedAll = linkedItems(item).filter((l) => !satIds.has(l.id))
  const on = new Set(enabled)
  const linked = linkedAll.filter((l) => on.has(l.type))
  const pos = layoutFocus(item.id, sats, linked)
  const nodes = [
    itemNode(item, { kind: 'center', size: 64, inSpell: spellSet.has(item.id) }),
    ...sats.map(({ relation, ...s }) => s),
    ...linked.map((l) => itemNode(l, { size: 18, inSpell: spellSet.has(l.id) })),
  ].map((n) => withPos(n, pos))
  const edges = [
    ...sats.map((s) => ({ id: `${item.id}>${s.id}`, source: item.id, target: s.id, ...(s.relation ? { relation: 'family' } : {}) })),
    ...linked.map((l) => ({ id: `${item.id}~${l.id}`, source: item.id, target: l.id, link: 1 })),
  ]
  return { nodes, edges, counts: countTypes(linkedAll), item, linkedTotal: linkedAll.length, linkedShown: linked.length }
}
