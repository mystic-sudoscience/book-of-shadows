<script>
  // A rounded chip with an optional colour dot, related-wordings count, and remove button.
  let { color = null, dot = true, dashed = false, more = [], onremove, removeLabel = 'Remove', children } = $props()
</script>

<span class="chip" class:dashed style:--c={color ?? 'var(--border)'}>
  {#if color && dot}<span class="cdot"></span>{/if}
  {@render children()}
  {#if more.length}<span class="more" title={more.join(', ')}>+{more.length}</span>{/if}
  {#if onremove}<button onclick={onremove} aria-label={removeLabel}>×</button>{/if}
</span>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px 3px 10px;
    border-radius: 999px;
    border: 1px solid var(--c);
    font-size: 13px;
    text-transform: capitalize;
  }
  .chip.dashed {
    border-style: dashed;
  }
  .cdot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--c);
  }
  .more {
    font-size: 11px;
    color: var(--muted);
    cursor: help;
  }
  button {
    border: 0;
    background: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    padding: 0 4px;
  }
</style>
