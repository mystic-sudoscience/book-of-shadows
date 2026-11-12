<script>
  import Graph from './components/Graph.svelte'
  import Search from './components/Search.svelte'
  import TypeToggles from './components/TypeToggles.svelte'
  import Details from './components/Details.svelte'
  import Spell from './components/Spell.svelte'
  import { byIntention, itemsById, countFor, groupCountFor, itemsFor, relatedTo, intentions as allIntentions } from './lib/data.js'
  import { TYPE_ORDER, itemColor, shapeOf } from './lib/types.js'
  import { layoutWeb, layoutFocus } from './lib/layout.js'
  import { parseHash, intentionsHash, itemHash, go, MAX_INTENTIONS } from './lib/route.js'
  import { load, save } from './lib/storage.js'

  let route = $state(parseHash(location.hash))
  $effect(() => {
    const onhash = () => (route = parseHash(location.hash))
    addEventListener('hashchange', onhash)
    return () => removeEventListener('hashchange', onhash)
  })

  let enabled = $state(load('spellweb.types', TYPE_ORDER).filter((t) => TYPE_ORDER.includes(t)))
  // false: an intention also brings in the more specific wordings grouped under it.
  let exact = $state(load('spellweb.exact', false))
  let spell = $state(load('spellweb.spell', []).filter((id) => itemsById.has(id)))
  let selectedId = $state(null)
  // The intentions of the last intention web, so item views and shift-click can build on them.
  let lastIntentions = $state([])

  $effect(() => save('spellweb.types', enabled))
  $effect(() => save('spellweb.spell', spell))
  $effect(() => save('spellweb.exact', exact))

  const active = $derived(route.mode === 'intentions' ? route.intentions.filter((i) => byIntention.has(i)) : [])
  $effect(() => {
    if (active.length) lastIntentions = active
  })
  $effect(() => {
    if (route.mode === 'item' && itemsById.has(route.item)) selectedId = route.item
  })

  const selected = $derived(selectedId ? itemsById.get(selectedId) : null)
  const spellSet = $derived(new Set(spell))
  const spellItems = $derived(spell.map((id) => itemsById.get(id)))
  const highlight = $derived(active.length ? active : lastIntentions)

  // Build the graph for the current view.
  const view = $derived.by(() => {
    if (route.mode === 'intentions' && active.length) {
      const members = new Map()
      active.forEach((intent, i) => {
        for (const item of itemsFor(intent, exact)) {
          const m = members.get(item.id) ?? { item, mask: 0 }
          m.mask |= 1 << i
          members.set(item.id, m)
        }
      })
      const counts = {}
      for (const { item } of members.values()) counts[item.type] = (counts[item.type] ?? 0) + 1
      const on = new Set(enabled)
      const shown = [...members.values()].filter((m) => on.has(m.item.type))
      const hubIds = active.map((a) => 'intent:' + a)
      const pos = layoutWeb(hubIds, shown)
      const full = (1 << active.length) - 1
      const nodes = [
        ...active.map((a, i) => ({ id: hubIds[i], label: a, name: a, kind: 'hub', hub: i, size: 64, shape: 'ellipse', ...pos.get(hubIds[i]) })),
        ...shown.map(({ item, mask }) => {
          const bits = mask.toString(2).replaceAll('0', '').length
          return {
            id: item.id,
            itemId: item.id,
            label: item.name,
            kind: 'item',
            color: itemColor(item),
            shape: shapeOf(item.type),
            size: 16 + 5 * (bits - 1),
            inSpell: spellSet.has(item.id),
            ...pos.get(item.id),
          }
        }),
      ]
      const edges = shown.flatMap(({ item, mask }) =>
        active.map((_, i) => (mask & (1 << i) ? { id: `${hubIds[i]}>${item.id}`, source: hubIds[i], target: item.id, hub: i } : null)).filter(Boolean),
      )
      const sharedAll = active.length > 1 ? shown.filter((m) => m.mask === full).length : 0
      return { nodes, edges, counts, total: members.size, shown: shown.length, sharedAll }
    }

    if (route.mode === 'item' && itemsById.has(route.item)) {
      const item = itemsById.get(route.item)
      const relatives = [item.parent, ...item.children].filter(Boolean).map((id) => itemsById.get(id))
      const sats = [
        ...relatives.map((r) => ({ id: r.id, itemId: r.id, label: r.name, kind: 'item', color: itemColor(r), shape: shapeOf(r.type), size: 20, relation: true })),
        ...item.properties.map((p) => ({ id: 'intent:' + p, name: p, label: p, kind: 'intention', shape: 'ellipse', size: Math.round(10 + 2.5 * Math.log2(countFor(p) + 1)) })),
      ]
      const pos = layoutFocus(item.id, sats)
      const nodes = [
        { id: item.id, itemId: item.id, label: item.name, kind: 'center', color: itemColor(item), shape: shapeOf(item.type), size: 64, inSpell: spellSet.has(item.id), ...pos.get(item.id) },
        ...sats.map(({ relation, ...s }) => ({ ...s, inSpell: s.itemId && spellSet.has(s.itemId), ...pos.get(s.id) })),
      ]
      const edges = sats.map((s) => ({ id: `${item.id}>${s.id}`, source: item.id, target: s.id, ...(s.relation ? { relation: 'family' } : {}) }))
      return { nodes, edges, counts: null, item }
    }
    return null
  })

  // --- navigation -------------------------------------------------------
  function showIntention(name, add = false) {
    const base = add ? highlight : []
    if (base.includes(name)) return go(intentionsHash(base))
    go(intentionsHash([...base, name].slice(-MAX_INTENTIONS)))
  }
  function addIntention(name) {
    showIntention(name, route.mode === 'intentions' && active.length < MAX_INTENTIONS)
  }
  function removeIntention(name) {
    go(intentionsHash(active.filter((a) => a !== name)))
  }
  function focusItem(id) {
    selectedId = id
    go(itemHash(id))
  }
  function toggleSpell(id) {
    spell = spellSet.has(id) ? spell.filter((x) => x !== id) : [...spell, id]
  }

  let graph = $state()
  let panelOpen = $state(false) // mobile: show sidebar
  const starters = allIntentions.slice(0, 18)
</script>

<div class="app">
  <header class="top">
    <h1><a href="#/">Spell Web</a></h1>
    <nav class="history">
      <button onclick={() => history.back()} aria-label="Back" title="Back">←</button>
      <button onclick={() => history.forward()} aria-label="Forward" title="Forward">→</button>
    </nav>
    <Search
      placeholder={active.length && active.length < MAX_INTENTIONS ? 'Add an intention to overlap, or find an item…' : 'Search intentions or items…'}
      onintention={addIntention}
      onitem={focusItem}
    />
    <div class="chips">
      {#each active as a, i (a)}
        <span class="hub-chip" style:--c="var(--hub-{i})">
          <span class="dot"></span>{a}
          {#if !exact && relatedTo(a).size > 1}<span class="more" title={[...relatedTo(a)].slice(1).join(', ')}>+{relatedTo(a).size - 1}</span>{/if}
          <button onclick={() => removeIntention(a)} aria-label="Remove {a}">×</button>
        </span>
      {/each}
    </div>
    <button class="filters-btn" onclick={() => (panelOpen = !panelOpen)} aria-expanded={panelOpen}>Filters</button>
  </header>

  <aside class="left" class:open={panelOpen}>
    <TypeToggles {enabled} counts={view?.counts ?? null} disabled={route.mode === 'item'} onchange={(t) => (enabled = t)} />
  </aside>

  <main class="stage">
    {#if view}
      <Graph
        bind:this={graph}
        nodes={view.nodes}
        edges={view.edges}
        selected={selectedId}
        onselect={(id) => (selectedId = id)}
        onfocus={focusItem}
        onintention={showIntention}
      />
      <div class="overlay top-left">
        {#if view.item}
          <p>Double-click an item to centre on it · click an intention to see its web</p>
        {:else}
          <p>
            <strong>{view.shown}</strong> of {view.total} items{#if view.shown < view.total}&nbsp;(filtered){/if}
            {#if active.length > 1}&nbsp;· <strong>{view.sharedAll}</strong> match all {active.length}{/if}
          </p>
          {#if active.some((a) => relatedTo(a).size > 1)}
            <label class="exact">
              <input type="checkbox" checked={!exact} onchange={(e) => (exact = !e.currentTarget.checked)} />
              Include related wordings
              <span class="legend">({active.filter((a) => relatedTo(a).size > 1).map((a) => `${a}: +${relatedTo(a).size - 1}`).join(', ')})</span>
            </label>
          {/if}
          {#if active.length > 1}
            <p class="legend">Centre: shared by all · {active.length === 3 ? 'between two hubs: shared by those two · ' : ''}outside: one intention only</p>
          {:else if active.length < MAX_INTENTIONS}
            <p class="legend">Search for a second intention to see the overlap</p>
          {/if}
        {/if}
      </div>
      <div class="overlay bottom-left zoom">
        <button onclick={() => graph.zoomBy(1.3)} aria-label="Zoom in">+</button>
        <button onclick={() => graph.zoomBy(1 / 1.3)} aria-label="Zoom out">−</button>
        <button onclick={() => graph.fit()} aria-label="Fit to screen">Fit</button>
      </div>
      {#if view.shown === 0}
        <div class="overlay center"><p>No items of the selected types. Turn on more types in Filters.</p></div>
      {/if}
    {:else}
      <div class="home">
        <h2>What is your intention?</h2>
        <p>Pick an intention to see every plant, crystal, metal, color, day and more that corresponds to it. Add a second or third to find what they share.</p>
        <div class="starters">
          {#each starters as s (s)}
            <button onclick={() => showIntention(s)}>{s} <span>{groupCountFor(s)}</span></button>
          {/each}
        </div>
        {#if route.mode !== 'home'}<p class="muted">That view could not be found.</p>{/if}
      </div>
    {/if}
  </main>

  <aside class="right">
    {#if selected}
      <div class="panel details">
        <Details
          item={selected}
          active={highlight}
          {exact}
          inSpell={spellSet.has(selected.id)}
          onselect={(id) => (selectedId = id)}
          onfocus={focusItem}
          onintention={showIntention}
          ontogglespell={toggleSpell}
          onclose={() => (selectedId = null)}
        />
      </div>
    {/if}
    <div class="panel">
      <Spell
        {spellItems}
        active={highlight}
        {exact}
        onselect={(id) => (selectedId = id)}
        onremove={(id) => (spell = spell.filter((x) => x !== id))}
        onclear={() => (spell = [])}
      />
    </div>
  </aside>
</div>

<style>
  .app {
    height: 100dvh;
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr) 360px;
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas:
      'top top top'
      'left stage right';
  }
  .top {
    grid-area: top;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-wrap: wrap;
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  h1 a {
    color: inherit;
    text-decoration: none;
  }
  .history {
    display: flex;
    gap: 2px;
  }
  .history button,
  .zoom button,
  .filters-btn {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    border-radius: 6px;
    padding: 4px 9px;
    font: inherit;
    cursor: pointer;
  }
  .history button:hover,
  .zoom button:hover {
    background: var(--surface-2);
  }
  .filters-btn {
    display: none;
  }
  .chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .hub-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px 3px 10px;
    border-radius: 999px;
    border: 1px solid var(--c);
    font-size: 13px;
    text-transform: capitalize;
  }
  .hub-chip .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--c);
  }
  .hub-chip button {
    border: 0;
    background: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    padding: 0 4px;
  }
  .hub-chip .more {
    font-size: 11px;
    color: var(--muted);
    cursor: help;
  }
  .exact {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 2px 0 4px;
    cursor: pointer;
  }
  .exact input {
    margin: 0;
    accent-color: var(--accent);
  }
  .left {
    grid-area: left;
    overflow: auto;
    padding: 14px 12px;
    border-right: 1px solid var(--border);
    background: var(--surface);
  }
  .stage {
    grid-area: stage;
    position: relative;
    overflow: hidden;
    background: var(--bg);
  }
  .right {
    grid-area: right;
    overflow: auto;
    border-left: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
  }
  .panel {
    padding: 14px 16px;
  }
  .panel.details {
    border-bottom: 1px solid var(--border);
  }
  .overlay {
    position: absolute;
    z-index: 5;
    pointer-events: none;
    font-size: 13px;
  }
  .overlay p {
    margin: 0 0 2px;
  }
  .overlay > * {
    pointer-events: auto;
  }
  .top-left {
    top: 10px;
    left: 12px;
    right: 12px;
  }
  .legend {
    color: var(--muted);
  }
  .bottom-left {
    bottom: 12px;
    left: 12px;
    display: flex;
    gap: 4px;
  }
  .center {
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--muted);
  }
  .home {
    max-width: 560px;
    margin: 12vh auto 0;
    padding: 0 16px;
    text-align: center;
  }
  .home h2 {
    font-family: var(--font-display);
    font-size: 34px;
    font-weight: 600;
    margin: 0 0 8px;
  }
  .home p {
    color: var(--muted);
    margin: 0 0 20px;
  }
  .starters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
  }
  .starters button {
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
  .starters button:hover {
    border-color: var(--accent);
  }
  .starters span {
    color: var(--muted);
    font-size: 12px;
    margin-left: 2px;
  }
  .muted {
    color: var(--muted);
  }

  @media (max-width: 900px) {
    .app {
      height: auto;
      min-height: 100dvh;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto 65dvh auto;
      grid-template-areas: 'top' 'left' 'stage' 'right';
    }
    .filters-btn {
      display: inline-block;
      margin-left: auto;
    }
    .left {
      display: none;
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }
    .left.open {
      display: block;
    }
    .right {
      border-left: 0;
      border-top: 1px solid var(--border);
    }
    .home {
      margin-top: 6vh;
    }
  }
</style>
