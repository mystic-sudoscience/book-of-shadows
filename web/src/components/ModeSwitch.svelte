<script>
  // Full / Focused properties switch (see lib/data.js).
  import { mode, setMode } from '../lib/data.js'

  const OPTIONS = [
    { id: 'full', label: 'Full', title: 'Every property from every source' },
    { id: 'focused', label: 'Focused', title: "Only each item's core properties" },
  ]
</script>

<div role="group" aria-label="Properties">
  <h3 class="label">Properties</h3>
  <div class="seg">
    {#each OPTIONS as o (o.id)}
      <button class:on={mode === o.id} aria-pressed={mode === o.id} onclick={() => setMode(o.id)} title={o.title}>{o.label}</button>
    {/each}
  </div>
</div>

<style>
  h3 {
    margin-bottom: 6px;
  }
  .seg {
    display: flex;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  button {
    flex: 1;
    padding: 5px 8px;
    background: none;
    border: 0;
    color: var(--muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  button + button {
    border-left: 1px solid var(--border);
  }
  button.on {
    background: var(--surface-2);
    color: var(--accent-text);
    font-weight: 600;
  }
</style>
