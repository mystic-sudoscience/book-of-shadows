// Small collection helpers.

/** Map each key (one, or an array of keys) to the list of values that have it. */
export function groupBy(list, keyOf) {
  const out = new Map()
  for (const v of list) {
    const keys = keyOf(v)
    for (const k of Array.isArray(keys) ? keys : [keys]) {
      if (!out.has(k)) out.set(k, [])
      out.get(k).push(v)
    }
  }
  return out
}
