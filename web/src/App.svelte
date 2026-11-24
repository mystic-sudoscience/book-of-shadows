<script>
  import Graph from './components/Graph.svelte'
  import Search from './components/Search.svelte'
  import TypeToggles from './components/TypeToggles.svelte'
  import Details from './components/Details.svelte'
  import Spell from './components/Spell.svelte'
  import SpellPage from './components/SpellPage.svelte'
  import Chip from './components/Chip.svelte'
  import ModeSwitch from './components/ModeSwitch.svelte'
  import WebLegend from './components/WebLegend.svelte'
  import { byIntention, itemsById, groupCountFor, relatedTo, intentions as allIntentions } from './lib/data.js'
  import { TYPE_ORDER } from './lib/types.js'
  import { intentionWeb, spellWeb, itemView } from './lib/web.js'
  import { parseHash, intentionsHash, itemHash, go, MAX_INTENTIONS, isItemHub, itemHub, isSpellRoute } from './lib/route.js'
  import { persisted, spell } from './lib/state.svelte.js'

  let route = $state(parseHash(location.hash))
  $effect(() => {
    const onhash = () => (route = parseHash(location.hash))
    addEventListener('hashchange', onhash)
    return () => removeEventListener('hashchange', onhash)
  })

  const enabled = persisted('spellweb.types', TYPE_ORDER, (types) => types.filter((t) => TYPE_ORDER.includes(t)))
  // false: an intention also brings in the more specific wordings grouped under it.
  const exact = persisted('spellweb.exact', false)
  let selectedId = $state(null)

  const onSpellTab = $derived(isSpellRoute(route))
  // Where the Explore tab returns to, and the hubs of the last web (so item views can build on them).
  let lastExplore = $state('#/explore')
  let lastHubs = $state([])

  // Hubs of the web: intentions, or items written as '@<item id>'.
  const hubs = $derived(
    route.mode === 'intentions' ? route.intentions.filter((h) => (isItemHub(h) ? itemsById.has(h.slice(1)) : byIntention.has(h))) : [],
  )
  const baseHubs = $derived(hubs.length ? hubs : lastHubs)
  // The intentions to highlight in item details.
  const highlight = $derived(onSpellTab ? spell.intentions : baseHubs.filter((h) => !isItemHub(h)))
  const selected = $derived(selectedId ? itemsById.get(selectedId) : null)
  const spellSet = $derived(new Set(spell.ids))

  $effect(() => {
    if (!onSpellTab) lastExplore = location.hash || '#/explore'
  })
  $effect(() => {
    if (hubs.length) lastHubs = hubs
  })
  $effect(() => {
    if (route.mode === 'item' && itemsById.has(route.item)) selectedId = route.item
  })

  // The graph for the current view.
  const view = $derived.by(() => {
    const ctx = { exact: exact.value, enabled: enabled.value, spellSet }
    if (route.mode === 'intentions' && hubs.length) return intentionWeb(hubs, ctx)
    if (route.mode === 'spell' && spell.ids.length) return spellWeb(spell.items, { ...ctx, starred: spell.intentions })
    if (route.mode === 'item' && itemsById.has(route.item)) return itemView(itemsById.get(route.item), ctx)
    return null
  })

  // --- navigation -------------------------------------------------------
  /** Show a web with `hub`, added to the current (or last) web when `add` is true. */
  function showHub(hub, add = false) {
    const base = add ? baseHubs : []
    go(intentionsHash(base.includes(hub) ? base : [...base, hub].slice(-MAX_INTENTIONS)))
  }
  const addIntention = (name) => showHub(name, route.mode === 'intentions' && hubs.length < MAX_INTENTIONS)
  const addItemHub = (id) => showHub(itemHub(id), true)
  const removeHub = (hub) => go(intentionsHash(hubs.filter((h) => h !== hub)))
  const select = (id) => (selectedId = id)
  function focusItem(id) {
    selectedId = id
    go(itemHash(id))
  }

  let graph = $state()
  let panelOpen = $state(false) // mobile: show sidebar
  const starters = allIntentions.slice(0, 18)
</script>

<div class="app" class:spellpage={route.mode === 'home'}>
  <header class="top">
    <h1><a href="#/">Spell Web</a></h1>
    <nav class="tabs" aria-label="Sections">
      <a href="#/" class:on={onSpellTab} aria-current={onSpellTab ? 'page' : undefined}>Spell{#if spell.ids.length}&nbsp;<span class="n">{spell.ids.length}</span>{/if}</a>
      <a href={lastExplore} class:on={!onSpellTab} aria-current={!onSpellTab ? 'page' : undefined}>Explore</a>
    </nav>
    <nav class="history">
      <button class="btn" onclick={() => history.back()} aria-label="Back" title="Back">←</button>
      <button class="btn" onclick={() => history.forward()} aria-label="Forward" title="Forward">→</button>
    </nav>
    {#if onSpellTab}
      <Search placeholder="Add an intention to the spell, or find an item…" onintention={spell.addIntention} onitem={select} />
    {:else}
      <Search
        placeholder={hubs.length && hubs.length < MAX_INTENTIONS ? 'Add an intention to overlap, or find an item…' : 'Search intentions or items…'}
        onintention={addIntention}
        onitem={focusItem}
      />
    {/if}
    <div class="chips">
      {#each hubs as a, i (a)}
        {@const it = isItemHub(a) ? itemsById.get(a.slice(1)) : null}
        <Chip
          color="var(--hub-{i})"
          dashed={!!it}
          more={it || exact.value ? [] : [...relatedTo(a)].slice(1)}
          onremove={() => removeHub(a)}
          removeLabel="Remove {it ? it.name : a}">{#if it}<button class="link plain" onclick={() => select(it.id)}>{it.name}</button>{:else}{a}{/if}</Chip
        >
      {/each}
    </div>
    <button class="btn filters-btn" onclick={() => (panelOpen = !panelOpen)} aria-expanded={panelOpen}>Filters</button>
  </header>

  <aside class="left" class:open={panelOpen}>
    <ModeSwitch />
    <TypeToggles enabled={enabled.value} counts={view?.counts ?? null} onchange={(t) => (enabled.value = t)} />
  </aside>

  <main class="stage" class:scroll={route.mode === 'home'}>
    {#if route.mode === 'home'}
      <SpellPage
        exact={exact.value}
        {selectedId}
        onselect={select}
        onexplore={() => go(intentionsHash(spell.intentions.slice(0, MAX_INTENTIONS)))}
        onview={() => go('#/spell')}
      />
    {:else if view}
      <Graph
        bind:this={graph}
        nodes={view.nodes}
        edges={view.edges}
        selected={selectedId}
        onselect={select}
        onfocus={focusItem}
        onintention={showHub}
        onadditem={addItemHub}
      />
      <div class="overlay top-left">
        <WebLegend {view} {hubs} exact={exact.value} spellIntentions={spell.intentions} onexact={(v) => (exact.value = v)} />
      </div>
      <div class="overlay bottom-left zoom">
        <button class="btn" onclick={() => graph.zoomBy(1.3)} aria-label="Zoom in">+</button>
        <button class="btn" onclick={() => graph.zoomBy(1 / 1.3)} aria-label="Zoom out">−</button>
        <button class="btn" onclick={() => graph.fit()} aria-label="Fit to screen">Fit</button>
      </div>
      {#if view.shown === 0}
        <div class="overlay center"><p>No items of the selected types. Turn on more types in Filters.</p></div>
      {/if}
    {:else}
      <div class="home">
        {#if route.mode === 'spell'}
          <h2>Your spell is empty</h2>
          <p>Add components on the <a href="#/">spell page</a> or from the explorer, then view them as a web.</p>
        {:else}
        <h2>Explore</h2>
        <p>Pick an intention to see every plant, crystal, metal, color, day and more that corresponds to it. Add up to five intentions or items to find what they share, then add what you like to your spell.</p>
        <div class="starters">
          {#each starters as s (s)}
            <button class="btn" onclick={() => showHub(s)}>{s} <span class="muted">{groupCountFor(s)}</span></button>
          {/each}
        </div>
        {#if route.mode !== 'explore'}<p class="muted">That view could not be found.</p>{/if}
        {/if}
      </div>
    {/if}
  </main>

  <aside class="right">
    {#if selected}
      <div class="panel details">
        <Details
          item={selected}
          active={highlight}
          exact={exact.value}
          inSpell={spellSet.has(selected.id)}
          onselect={select}
          onfocus={focusItem}
          onintention={showHub}
          ontogglespell={spell.toggle}
          inWeb={hubs.includes(itemHub(selected.id))}
          onaddhub={addItemHub}
          onclose={() => (selectedId = null)}
        />
      </div>
    {/if}
    {#if !onSpellTab}
      <div class="panel">
        <Spell exact={exact.value} onselect={select} onopen={() => go('#/')} />
      </div>
    {:else if !selected}
      <div class="panel muted">Select a component or an idea to see its details here.</div>
    {/if}
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
  .tabs {
    display: flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: 9px;
  }
  .tabs a {
    padding: 4px 12px;
    border-radius: 7px;
    color: var(--muted);
    text-decoration: none;
    font-size: 14px;
  }
  .tabs a:hover {
    color: var(--text);
  }
  .tabs a.on {
    background: var(--surface-2);
    color: var(--accent-text);
    font-weight: 600;
  }
  .tabs .n {
    font-weight: 400;
    color: var(--muted);
    font-size: 12px;
  }
  .app.spellpage {
    grid-template-columns: minmax(0, 1fr) 360px;
    grid-template-areas:
      'top top'
      'stage right';
  }
  .app.spellpage .left {
    display: none;
  }
  .stage.scroll {
    overflow: auto;
  }
  .history .btn,
  .zoom .btn {
    padding: 4px 9px;
    border-radius: 6px;
  }
  .filters-btn {
    display: none;
  }
  .plain {
    color: inherit;
    text-transform: none;
  }
  .chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
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
  .overlay :global(p) {
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
  .starters .btn {
    border-radius: 999px;
    font-size: 14px;
  }
  .starters .btn:hover {
    border-color: var(--accent);
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
    .app.spellpage {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto auto;
      grid-template-areas: 'top' 'stage' 'right';
    }
    .app.spellpage .filters-btn {
      display: none;
    }
  }
</style>
