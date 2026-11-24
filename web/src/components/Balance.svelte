<script>
  // Which chakras and elements a set of items covers, as rows of pills.
  import { CHAKRAS, ELEMENTS, coverage } from '../lib/spell.js'

  let { items, onselect } = $props()

  const rows = $derived([
    { label: 'Chakras', list: coverage(items, 'chakra', CHAKRAS) },
    { label: 'Elements', list: coverage(items, 'element', ELEMENTS) },
  ])
</script>

{#each rows as row (row.label)}
  <div class="row">
    <span class="kind">{row.label} <span class="count">{row.list.filter((c) => c.items.length).length}/{row.list.length}</span></span>
    <div class="pills">
      {#each row.list as c (c.value)}
        <button
          class="pill"
          class:on={c.items.length}
          title={c.items.length ? `${c.value}: ${c.items.join(', ')}` : `${c.value}: not covered`}
          onclick={() => onselect(c.id)}>{c.value}{#if c.items.length > 1}<span class="x">×{c.items.length}</span>{/if}</button
        >
      {/each}
    </div>
  </div>
{/each}

<style>
  .row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .kind {
    color: var(--muted);
    font-size: 12px;
  }
  .count {
    color: var(--accent-text);
    font-variant-numeric: tabular-nums;
  }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .pill {
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px dashed var(--border);
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    text-transform: capitalize;
  }
  .pill.on {
    border-style: solid;
    border-color: var(--accent);
    background: var(--surface-2);
    color: var(--text);
  }
  .x {
    margin-left: 4px;
    color: var(--muted);
    font-size: 11px;
  }
</style>
