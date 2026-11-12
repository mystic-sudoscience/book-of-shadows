<script>
  // Renders any YAML field value: text (linked to its item when one exists), lists, or nested maps.
  import Value from './Value.svelte'
  import { linkedItem, splitValues } from '../lib/data.js'

  let { field = '', value, onselect } = $props()

  const isMap = $derived(value && typeof value === 'object' && !Array.isArray(value))
  const parts = $derived(isMap ? [] : splitValues(value))
  const longList = $derived(Array.isArray(value) && value.some((v) => typeof v === 'object' || String(v).length > 28))
</script>

{#if isMap}
  <dl class="nested">
    {#each Object.entries(value) as [k, v] (k)}
      <dt>{k}</dt>
      <dd><Value field={k} value={v} {onselect} /></dd>
    {/each}
  </dl>
{:else if longList}
  <ul>
    {#each value as v, i (i)}
      <li><Value {field} value={v} {onselect} /></li>
    {/each}
  </ul>
{:else}
  {#each parts as part, i (i)}
    {@const linked = linkedItem(field, part)}
    {#if i > 0},&nbsp;{/if}
    {#if linked}
      <button class="ref" onclick={() => onselect(linked.id)}>{part}</button>
    {:else if typeof part === 'boolean'}
      {part ? 'yes' : 'no'}
    {:else}
      {part}
    {/if}
  {/each}
{/if}

<style>
  .nested {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 2px 10px;
    margin: 2px 0 0;
  }
  dt {
    color: var(--muted);
  }
  dd {
    margin: 0;
  }
  ul {
    margin: 0;
    padding-left: 18px;
  }
  .ref {
    background: none;
    border: 0;
    padding: 0;
    color: var(--accent-text);
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, currentColor 40%, transparent);
    text-underline-offset: 2px;
  }
</style>
