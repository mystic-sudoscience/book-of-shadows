<script>
  import { intentions, items, countFor, groupCountFor, relatedTo } from '../lib/data.js'
  import { typeInfo } from '../lib/types.js'

  let { placeholder = 'Search intentions or items…', onintention, onitem } = $props()

  let query = $state('')
  let open = $state(false)
  let active = $state(0)

  function rank(name, q) {
    const n = name.toLowerCase()
    if (n === q) return 0
    if (n.startsWith(q)) return 1
    if (n.split(/[\s/&-]+/).some((w) => w.startsWith(q))) return 2
    return n.includes(q) ? 3 : -1
  }

  /** Entries whose name matches q, best match first, then by `tiebreak`. */
  const matching = (list, q, tiebreak, limit) =>
    list
      .map((x) => ({ ...x, r: rank(x.name, q) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || tiebreak(a, b))
      .slice(0, limit)

  const results = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return [
      ...matching(intentions.map((name) => ({ kind: 'intention', name })), q, (a, b) => groupCountFor(b.name) - groupCountFor(a.name), 8),
      ...matching(items.map((item) => ({ kind: 'item', item, name: item.name })), q, (a, b) => a.name.localeCompare(b.name), 6),
    ]
  })

  function choose(res) {
    if (!res) return
    if (res.kind === 'intention') onintention(res.name)
    else onitem(res.item.id)
    query = ''
    open = false
  }

  function onkeydown(e) {
    if (e.key === 'ArrowDown') {
      active = Math.min(active + 1, results.length - 1)
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      active = Math.max(active - 1, 0)
      e.preventDefault()
    } else if (e.key === 'Enter') {
      choose(results[active])
    } else if (e.key === 'Escape') {
      open = false
      e.currentTarget.blur()
    }
  }
</script>

<div class="search">
  <input
    type="search"
    {placeholder}
    bind:value={query}
    oninput={() => ((open = true), (active = 0))}
    onfocus={() => (open = true)}
    onblur={() => setTimeout(() => (open = false), 150)}
    {onkeydown}
    aria-label="Search intentions or items"
    autocomplete="off"
  />
  {#if open && results.length}
    <ul class="results" role="listbox">
      {#each results as res, i (res.kind + res.name + (res.item?.id ?? ''))}
        {#if i === 0 && res.kind === 'intention'}<li class="heading">Intentions</li>{/if}
        {#if res.kind === 'item' && (i === 0 || results[i - 1].kind === 'intention')}<li class="heading">Items</li>{/if}
        <li role="option" aria-selected={i === active}>
          <button class:active={i === active} onmousedown={(e) => e.preventDefault()} onclick={() => choose(res)} onmouseenter={() => (active = i)}>
            {#if res.kind === 'intention'}
              <span class="name">{res.name}</span>
              <span class="meta">{groupCountFor(res.name)} {groupCountFor(res.name) === 1 ? 'item' : 'items'}{#if relatedTo(res.name).size > 1}&nbsp;· +{relatedTo(res.name).size - 1} related{/if}</span>
            {:else}
              <span class="dot" style:background={typeInfo(res.item.type).color}></span>
              <span class="name">{res.name}</span>
              <span class="meta">{typeInfo(res.item.type).label}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .search {
    position: relative;
    flex: 1;
    min-width: 0;
    max-width: 420px;
  }
  input {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font: inherit;
  }
  input:focus {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
  }
  .results {
    position: absolute;
    z-index: 50;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    margin: 0;
    padding: 4px;
    list-style: none;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: var(--shadow);
    max-height: 60vh;
    overflow: auto;
  }
  .heading {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    padding: 6px 8px 2px;
  }
  button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 8px;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  button.active {
    background: var(--surface-2);
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-size: 12px;
    color: var(--muted);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: none;
  }
</style>
