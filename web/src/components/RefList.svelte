<script>
  // A comma-separated list of names; ones with an item id are links to that item.
  let { refs, onselect } = $props()
</script>

{#each refs as r, i (r.id ?? r.name)}{#if i},&nbsp;{/if}{#if r.id}<button class="ref" onclick={() => onselect(r.id)}>{r.name}</button>{:else}<span
      class="unlinked"
      title="Not in the data yet">{r.name}</span
    >{/if}{/each}

<style>
  .unlinked {
    color: var(--muted);
  }
</style>
