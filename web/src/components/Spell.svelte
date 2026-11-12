<script>
  import { splitValues, toxicityWarning, weekdayForPlanet, itemsById, matchingProps } from '../lib/data.js'
  import { typeInfo, itemColor } from '../lib/types.js'

  let { spellItems, active = [], exact = false, onselect, onremove, onclear } = $props()

  // Items whose own type is a correspondence (a planet item counts as that planet, etc.).
  const SELF = { planets: 'planet', elements: 'element', zodiac: 'zodiac sign', chakras: 'chakra', holidays: 'holiday', weekdays: 'day' }
  const FIELDS = { planet: 'planet', element: 'element', 'moon phase': 'moon phase', 'zodiac sign': 'zodiac sign', chakra: 'chakra', holidays: 'holiday' }

  function correspondences(item) {
    const out = []
    for (const [field, kind] of Object.entries(FIELDS)) {
      if (item.fields[field]) for (const v of splitValues(item.fields[field])) out.push([kind, String(v).toLowerCase()])
    }
    if (SELF[item.type]) out.push([SELF[item.type], item.id.split(':')[1]])
    if (item.type === 'moon' && item.fields.type === 'phase') out.push(['moon phase', item.id.split(':')[1]])
    if (item.type === 'weekdays' && item.fields['ruling planet']) out.push(['planet', item.fields['ruling planet']])
    return out
  }

  const shared = $derived.by(() => {
    const tally = new Map()
    for (const it of spellItems) {
      const seen = new Set()
      for (const [kind, value] of correspondences(it)) {
        const key = `${kind}\u0000${value}`
        if (seen.has(key)) continue
        seen.add(key)
        tally.set(key, { kind, value, n: (tally.get(key)?.n ?? 0) + 1 })
      }
    }
    return [...tally.values()].filter((t) => t.n >= 2).sort((a, b) => b.n - a.n || a.kind.localeCompare(b.kind))
  })

  const bestDay = $derived.by(() => {
    const planet = shared.find((s) => s.kind === 'planet')
    if (!planet) return null
    const day = weekdayForPlanet.get(planet.value)
    return day ? { planet: planet.value, day } : null
  })

  const uncovered = $derived(active.filter((a) => !spellItems.some((it) => matchingProps(it, a, exact).length)))

  let copied = $state(false)
  async function copy() {
    const lines = [
      active.length ? `Intention: ${active.join(', ')}` : null,
      '',
      ...spellItems.map((it) => `- ${it.name} (${typeInfo(it.type).label.toLowerCase()})${toxicityWarning(it) ? ' ⚠ toxic' : ''}`),
      bestDay ? `\nDay: ${bestDay.day.name} (${bestDay.planet})` : null,
    ].filter((l) => l !== null)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      copied = true
      setTimeout(() => (copied = false), 1500)
    } catch {
      // clipboard unavailable
    }
  }
</script>

<section class="spell">
  <header>
    <h2>Spell components <span class="n">{spellItems.length}</span></h2>
    {#if spellItems.length}
      <div class="tools">
        <button class="link" onclick={copy}>{copied ? 'Copied' : 'Copy list'}</button>
        <button class="link" onclick={onclear}>Clear</button>
      </div>
    {/if}
  </header>

  {#if !spellItems.length}
    <p class="empty">Click an item in the web, then <strong>Add to spell</strong>. Double-click any item to centre the web on it.</p>
  {:else}
    <ul>
      {#each spellItems as it (it.id)}
        {@const matches = active.filter((a) => matchingProps(it, a, exact).length)}
        <li>
          <span class="dot" style:background={itemColor(it)}></span>
          <button class="name" onclick={() => onselect(it.id)}>{it.name}</button>
          {#if toxicityWarning(it)}<span class="warn" title="Toxicity warning — see details">⚠</span>{/if}
          <span class="type">{typeInfo(it.type).label}</span>
          {#if active.length > 1 && matches.length}<span class="match" title={matches.join(', ')}>{matches.length}/{active.length}</span>{/if}
          <button class="remove" onclick={() => onremove(it.id)} aria-label="Remove {it.name}">×</button>
        </li>
      {/each}
    </ul>

    {#if uncovered.length}
      <p class="hint">Nothing here covers <strong>{uncovered.join(', ')}</strong> yet.</p>
    {/if}

    {#if shared.length}
      <h3>Shared correspondences</h3>
      <ul class="shared">
        {#each shared.slice(0, 8) as s (s.kind + s.value)}
          {@const linked = itemsById.get(
            { planet: 'planets', element: 'elements', 'zodiac sign': 'zodiac', chakra: 'chakras', holiday: 'holidays', 'moon phase': 'moon', day: 'weekdays' }[s.kind] + ':' + s.value,
          )}
          <li>
            <span class="kind">{s.kind}</span>
            {#if linked}<button class="link" onclick={() => onselect(linked.id)}>{s.value}</button>{:else}{s.value}{/if}
            <span class="n">×{s.n}</span>
          </li>
        {/each}
      </ul>
      {#if bestDay}
        <p class="hint">
          Most items share <strong>{bestDay.planet}</strong>, which rules
          <button class="link" onclick={() => onselect(bestDay.day.id)}>{bestDay.day.name}</button>.
        </p>
      {/if}
    {/if}
  {/if}
</section>

<style>
  .spell {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
  }
  h3 {
    margin: 6px 0 0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 600;
  }
  .n {
    font-family: var(--font-ui);
    color: var(--muted);
    font-weight: 400;
    font-size: 13px;
  }
  .tools {
    display: flex;
    gap: 12px;
  }
  .empty,
  .hint {
    margin: 0;
    color: var(--muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 4px;
    border-radius: 6px;
  }
  li:hover {
    background: var(--surface-2);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: none;
    border: 1px solid var(--node-border);
  }
  .name {
    flex: 1;
    min-width: 0;
    text-align: left;
    background: none;
    border: 0;
    padding: 0;
    color: var(--text);
    font: inherit;
    cursor: pointer;
    text-transform: capitalize;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .type,
  .kind {
    color: var(--muted);
    font-size: 12px;
  }
  .kind {
    width: 84px;
    flex: none;
  }
  .match {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--accent-text);
  }
  .warn {
    color: var(--warn-text);
  }
  .remove {
    background: none;
    border: 0;
    color: var(--muted);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 2px;
  }
  .link {
    background: none;
    border: 0;
    padding: 0;
    color: var(--accent-text);
    font: inherit;
    cursor: pointer;
  }
  .shared .n {
    margin-left: auto;
  }
</style>
