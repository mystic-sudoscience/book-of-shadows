<script>
  // Compact spell list shown beside the explorer web.
  import ItemRow from './ItemRow.svelte'
  import { matchingProps } from '../lib/data.js'
  import { spell } from '../lib/state.svelte.js'

  let { exact = false, onselect, onopen } = $props()

  const intentions = $derived(spell.intentions)
  const matchesOf = (it) => intentions.filter((a) => matchingProps(it, a, exact).length)
</script>

<section class="spell">
  <header>
    <h2>{spell.name || 'Your spell'} <span class="n">{spell.ids.length}</span></h2>
    <button class="link" onclick={onopen}>Open spell →</button>
  </header>
  {#if !spell.ids.length}
    <p class="muted">Click an item in the web, then <strong>Add to spell</strong>.</p>
  {:else}
    <ul>
      {#each spell.items as it (it.id)}
        {@const matches = matchesOf(it)}
        <ItemRow item={it} matches={intentions.length > 1 && matches.length ? matches : null} total={intentions.length} {onselect} onaction={spell.remove} />
      {/each}
    </ul>
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
    gap: 8px;
  }
  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .n {
    font-family: var(--font-ui);
    color: var(--muted);
    font-weight: 400;
    font-size: 13px;
  }
  p {
    margin: 0;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .link {
    white-space: nowrap;
  }
</style>
