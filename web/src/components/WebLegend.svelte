<script>
  // The summary and legend shown over the graph, for each kind of view.
  import { relatedTo } from '../lib/data.js'
  import { MAX_INTENTIONS, isItemHub } from '../lib/route.js'

  let { view, hubs = [], exact = false, spellIntentions = [], onexact } = $props()

  const intentionHubs = $derived(hubs.filter((h) => !isItemHub(h)))
  const withRelated = $derived(intentionHubs.filter((a) => relatedTo(a).size > 1))
  const n = $derived(view.spell ? view.nodes.filter((nd) => nd.kind === 'hub').length : hubs.length)
</script>

{#if view.spell}
  <p>
    <strong>{n}</strong> components · <strong>{view.shown}</strong> shared{#if view.shown < view.total}&nbsp;of {view.total} (filtered){/if}
    {#if n > 1}&nbsp;· <strong>{view.sharedAll}</strong> shared by all{/if}
  </p>
  <p class="muted">
    Hubs: spell components · between them: intentions (purple) and linked items they share{#if spellIntentions.length}&nbsp;· ★ the spell's intentions{/if}
    · <a href="#/">back to the spell</a>
  </p>
{:else if view.item}
  <p>
    <strong>{view.item.properties.length}</strong> intentions · <strong>{view.linkedShown}</strong>
    {#if view.linkedShown < view.linkedTotal}of {view.linkedTotal}{/if} linked items
  </p>
  <p class="muted">Inner ring: intentions · outer ring: linked items · double-click any item to centre on it</p>
{:else}
  <p>
    <strong>{view.shown}</strong> of {view.total} items{#if view.shown < view.total}&nbsp;(filtered){/if}
    {#if n > 1}&nbsp;· <strong>{view.sharedAll}</strong> match all {n}{/if}
  </p>
  {#if withRelated.length}
    <label>
      <input type="checkbox" checked={!exact} onchange={(e) => onexact(!e.currentTarget.checked)} />
      Include related wordings
      <span class="muted">({withRelated.map((a) => `${a}: +${relatedTo(a).size - 1}`).join(', ')})</span>
    </label>
  {/if}
  {#if n > 1}
    <p class="muted">
      Centre: shared by all · {n === 3 ? 'between two hubs: shared by those two · ' : n > 3 ? 'nearer some hubs: shared by just those · ' : ''}outside: one hub only
    </p>
  {:else if n < MAX_INTENTIONS}
    <p class="muted">Search for a second intention, or add an item (shift-click it or use “Add to web”), to see the overlap</p>
  {/if}
  {#if hubs.some(isItemHub)}
    <p class="muted">Item hubs bring in their intentions (small purple nodes) and linked items</p>
  {/if}
{/if}

<style>
  p {
    margin: 0 0 2px;
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 2px 0 4px;
    cursor: pointer;
  }
  input {
    margin: 0;
    accent-color: var(--accent);
  }
</style>
