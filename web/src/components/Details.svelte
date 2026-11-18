<script>
  import Value from './Value.svelte'
  import { bibliography, itemsById, countFor, toxicityWarning, relatedTo, groupsOf, mode } from '../lib/data.js'
  import { typeInfo, itemColor } from '../lib/types.js'

  let { item, active = [], exact = false, inSpell = false, onselect, onfocus, onintention, ontogglespell, onclose } = $props()

  const parent = $derived(item.parent ? itemsById.get(item.parent) : null)
  const children = $derived(item.children.map((id) => itemsById.get(id)).filter(Boolean))
  const warning = $derived(toxicityWarning(item))
  // Properties that count as a match: the active intentions, plus their related wordings.
  const activeSet = $derived(new Set(active.flatMap((a) => (exact ? [a] : [...relatedTo(a)]))))
  const fields = $derived(Object.entries(item.fields).filter(([k]) => k !== 'toxicity' && k !== 'type'))
  // What this item names in its correspondences, grouped by collection (unresolved names shown as text).
  const LINK_LABELS = { deities: 'Deities', sea: 'From the sea' }
  const linkGroups = $derived(
    Object.entries(item.correspondences ?? {})
      .map(([coll, list]) => ({ coll, label: LINK_LABELS[coll] ?? typeInfo(coll).label, list }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  )
  // Items that name this one, grouped by type.
  const backGroups = $derived.by(() => {
    const groups = new Map()
    for (const id of item.linkedFrom ?? []) {
      const it = itemsById.get(id)
      if (!it) continue
      if (!groups.has(it.type)) groups.set(it.type, [])
      groups.get(it.type).push(it)
    }
    return [...groups.entries()].map(([type, list]) => ({ type, label: typeInfo(type).label, list: list.sort((a, b) => a.name.localeCompare(b.name)) }))
  })
  // Matched intentions first, then the rest alphabetically.
  const props = $derived([...item.properties].sort((a, b) => activeSet.has(b) - activeSet.has(a) || a.localeCompare(b)))
</script>

<article>
  <header>
    <span class="swatch" style:background={itemColor(item)}></span>
    <div class="title">
      <h2>{item.name}</h2>
      <p class="kind">
        {typeInfo(item.type).label}{#if item.fields.type}&nbsp;· {item.fields.type}{/if}
        {#if parent}&nbsp;· {item.relation === 'shades' ? 'shade' : item.relation === 'months' ? 'by month' : 'variety'} of
          <button class="ref" onclick={() => onselect(parent.id)}>{parent.name}</button>{/if}
      </p>
    </div>
    <button class="icon" onclick={onclose} aria-label="Close details">×</button>
  </header>

  <div class="actions">
    <button class="primary" class:on={inSpell} onclick={() => ontogglespell(item.id)}>
      {inSpell ? '✓ In spell' : '+ Add to spell'}
    </button>
    <button onclick={() => onfocus(item.id)}>Centre web on this</button>
  </div>

  {#if warning}
    <div class="warning" role="note">
      <strong>Caution{#if warning.who.length}: toxic to {warning.who.join(' and ')}{/if}</strong>
      {#each warning.notes as note, i (i)}<div>{note}</div>{/each}
    </div>
  {/if}

  <section>
    <h3>Intentions <span class="n">{item.properties.length}{#if mode === 'focused' && item.fullCount > item.properties.length} of {item.fullCount} · focused{/if}</span></h3>
    <div class="chips">
      {#each props as p (p)}
        <button
          class="chip"
          class:match={activeSet.has(p)}
          class:inherited={!item.own.includes(p)}
          title="{countFor(p)} items{groupsOf.has(p) ? ' · part of ' + groupsOf.get(p).join(', ') : ''} · click to explore, shift-click to add to the current web{item.own.includes(p) ? '' : ' · inherited from ' + parent?.name}"
          onclick={(e) => onintention(p, e.shiftKey)}>{p}</button
        >
      {/each}
    </div>
  </section>

  {#if children.length}
    <section>
      <h3>{item.children.length} {children[0].relation === 'shades' ? 'shades' : children[0].relation === 'months' ? 'months' : 'varieties'}</h3>
      <div class="chips">
        {#each children as c (c.id)}
          <button class="chip child" onclick={() => onselect(c.id)}>
            <span class="dot" style:background={itemColor(c)}></span>{c.name.replace(item.name + ' ', '').replace(/^\(|\)$/g, '')}
          </button>
        {/each}
      </div>
    </section>
  {/if}

  {#if linkGroups.length || backGroups.length}
    <section>
      <h3>Linked items</h3>
      <dl class="links">
        {#each linkGroups as g (g.coll)}
          <dt>{g.label}</dt>
          <dd>
            {#each g.list as l, i (l.name)}{#if i},&nbsp;{/if}{#if l.id}<button class="ref" onclick={() => onselect(l.id)}>{l.name}</button>{:else}<span class="unlinked" title="Not in the data yet">{l.name}</span>{/if}{/each}
          </dd>
        {/each}
      </dl>
      {#if backGroups.length}
        <h4>Linked from</h4>
        <dl class="links">
          {#each backGroups as g (g.type)}
            <dt>{g.label} <span class="n">{g.list.length}</span></dt>
            <dd>
              {#each g.list as it, i (it.id)}{#if i},&nbsp;{/if}<button class="ref" onclick={() => onselect(it.id)}>{it.name}</button>{/each}
            </dd>
          {/each}
        </dl>
      {/if}
    </section>
  {/if}

  {#if fields.length}
    <section>
      <h3>Correspondences & details</h3>
      <dl>
        {#each fields as [k, v] (k)}
          <dt>{k}</dt>
          <dd><Value field={k} value={v} {onselect} /></dd>
        {/each}
      </dl>
    </section>
  {/if}

  {#if item.citations.length}
    <section>
      <h3>Sources</h3>
      <ul class="sources">
        {#each item.citations as c (c)}<li>{bibliography[c] ?? c}</li>{/each}
      </ul>
    </section>
  {/if}
</article>

<style>
  article {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  header {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .swatch {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    flex: none;
    margin-top: 5px;
    border: 1px solid var(--node-border);
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 600;
    text-transform: capitalize;
    line-height: 1.2;
  }
  .kind {
    margin: 2px 0 0;
    color: var(--muted);
    font-size: 13px;
  }
  .icon {
    background: none;
    border: 0;
    color: var(--muted);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 4px;
  }
  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .actions button {
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .actions button:hover {
    background: var(--surface-2);
  }
  .actions .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .actions .primary.on {
    background: var(--surface);
    color: var(--accent-text);
    border-color: var(--accent);
  }
  .warning {
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--warn-bg);
    color: var(--warn-text);
    font-size: 13px;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 600;
  }
  .n {
    font-weight: 400;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .chip {
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .chip:hover {
    border-color: var(--accent);
  }
  .chip.match {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .chip.inherited:not(.match) {
    border-style: dashed;
    color: var(--muted);
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1px solid var(--node-border);
  }
  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 12px;
    margin: 0;
    font-size: 13px;
  }
  dt {
    color: var(--muted);
  }
  dd {
    margin: 0;
    min-width: 0;
  }
  h4 {
    margin: 10px 0 4px;
    font-size: 11px;
    color: var(--muted);
    font-weight: 600;
  }
  .links dd {
    line-height: 1.6;
  }
  .unlinked {
    color: var(--muted);
  }
  .sources {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    color: var(--muted);
  }
  .ref {
    background: none;
    border: 0;
    padding: 0;
    color: var(--accent-text);
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
  }
</style>
