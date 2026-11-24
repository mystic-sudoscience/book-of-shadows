<script>
  import Value from './Value.svelte'
  import RefList from './RefList.svelte'
  import { bibliography, itemsById, countFor, toxicityWarning, relatedTo, groupsOf, mode } from '../lib/data.js'
  import { typeInfo, itemColor } from '../lib/types.js'
  import { groupBy } from '../lib/util.js'

  let { item, active = [], exact = false, inSpell = false, inWeb = false, onselect, onfocus, onintention, ontogglespell, onaddhub, onclose } = $props()

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
  const backGroups = $derived(
    [...groupBy((item.linkedFrom ?? []).map((id) => itemsById.get(id)).filter(Boolean), (it) => it.type)].map(([type, list]) => ({
      type,
      label: typeInfo(type).label,
      list: list.sort((a, b) => a.name.localeCompare(b.name)),
    })),
  )
  // How a sub-item relates to its parent, singular and plural.
  const RELATION = { shades: ['shade', 'shades'], months: ['by month', 'months'], varieties: ['variety', 'varieties'] }
  const relation = (key) => RELATION[key] ?? RELATION.varieties
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
        {#if parent}&nbsp;· {relation(item.relation)[0]} of
          <button class="ref" onclick={() => onselect(parent.id)}>{parent.name}</button>{/if}
      </p>
    </div>
    <button class="icon" onclick={onclose} aria-label="Close details">×</button>
  </header>

  <div class="actions">
    <button class="btn primary" class:on={inSpell} onclick={() => ontogglespell(item.id)}>
      {inSpell ? '✓ In spell' : '+ Add to spell'}
    </button>
    <button class="btn" onclick={() => onfocus(item.id)}>Centre web on this</button>
    <button class="btn" disabled={inWeb} onclick={() => onaddhub(item.id)} title="Add as a hub to the intention web, to overlap with your intentions and other items">{inWeb ? '✓ In web' : '+ Add to web'}</button>
  </div>

  {#if warning}
    <div class="warning" role="note">
      <strong>Caution{#if warning.who.length}: toxic to {warning.who.join(' and ')}{/if}</strong>
      {#each warning.notes as note, i (i)}<div>{note}</div>{/each}
    </div>
  {/if}

  <section>
    <h3 class="label">Intentions <span class="n">{item.properties.length}{#if mode === 'focused' && item.fullCount > item.properties.length} of {item.fullCount} · focused{/if}</span></h3>
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
      <h3 class="label">{item.children.length} {relation(children[0].relation)[1]}</h3>
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
      <h3 class="label">Linked items</h3>
      <dl class="links">
        {#each linkGroups as g (g.coll)}
          <dt>{g.label}</dt>
          <dd>
            <RefList refs={g.list} {onselect} />
          </dd>
        {/each}
      </dl>
      {#if backGroups.length}
        <h4>Linked from</h4>
        <dl class="links">
          {#each backGroups as g (g.type)}
            <dt>{g.label} <span class="n">{g.list.length}</span></dt>
            <dd>
              <RefList refs={g.list} {onselect} />
            </dd>
          {/each}
        </dl>
      {/if}
    </section>
  {/if}

  {#if fields.length}
    <section>
      <h3 class="label">Correspondences & details</h3>
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
      <h3 class="label">Sources</h3>
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
    margin-bottom: 6px;
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
  .sources {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    color: var(--muted);
  }
</style>
