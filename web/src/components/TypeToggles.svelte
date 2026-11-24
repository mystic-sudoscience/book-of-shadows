<script>
  import { GROUPS, TYPES } from '../lib/types.js'

  /** enabled: array of type ids; counts: {type: number} for the current web, or null */
  let { enabled, counts = null, disabled = false, onchange } = $props()

  const on = $derived(new Set(enabled))

  function toggle(type) {
    const next = new Set(on)
    next.has(type) ? next.delete(type) : next.add(type)
    onchange([...next])
  }

  function setGroup(group, value) {
    const next = new Set(on)
    for (const [t, info] of Object.entries(TYPES)) if (info.group === group) value ? next.add(t) : next.delete(t)
    onchange([...next])
  }

  function only(type) {
    onchange([type])
  }
</script>

<div class="toggles" class:disabled>
  <div class="all">
    <button class="link" onclick={() => onchange(Object.keys(TYPES))}>All</button>
    <button class="link" onclick={() => onchange([])}>None</button>
  </div>
  {#each GROUPS as group (group.id)}
    {@const types = Object.entries(TYPES).filter(([, t]) => t.group === group.id)}
    {@const allOn = types.every(([t]) => on.has(t))}
    <section>
      <header>
        <h3 class="label">{group.label}</h3>
        <button class="link" onclick={() => setGroup(group.id, !allOn)}>{allOn ? 'Hide' : 'Show'}</button>
      </header>
      {#each types as [type, info] (type)}
        {@const n = counts?.[type] ?? 0}
        <div class="row" class:off={!on.has(type)} class:empty={counts && !n}>
          <label>
            <input type="checkbox" checked={on.has(type)} onchange={() => toggle(type)} />
            <span class="swatch {group.shape}" style:background={info.color}></span>
            <span class="label">{info.label}</span>
            {#if counts}<span class="count">{n}</span>{/if}
          </label>
          <button class="only" title="Show only {info.label.toLowerCase()}" onclick={() => only(type)}>only</button>
        </div>
      {/each}
    </section>
  {/each}
  {#if disabled}<p class="note">Type filters apply to intention webs.</p>{/if}
</div>

<style>
  .toggles {
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-size: 13px;
  }
  .disabled section {
    opacity: 0.5;
  }
  .all {
    display: flex;
    gap: 12px;
  }
  .link {
    font-size: 12px;
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .row {
    display: flex;
    align-items: center;
    border-radius: 6px;
  }
  .row:hover {
    background: var(--surface-2);
  }
  label {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    cursor: pointer;
  }
  input {
    margin: 0;
    accent-color: var(--accent);
  }
  .swatch {
    width: 11px;
    height: 11px;
    flex: none;
  }
  .swatch.ellipse {
    border-radius: 50%;
  }
  .swatch.diamond {
    transform: rotate(45deg) scale(0.85);
  }
  .swatch.round-rectangle {
    border-radius: 3px;
  }
  .label {
    flex: 1;
  }
  .count {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
  }
  .off .label,
  .empty .label {
    color: var(--muted);
  }
  .off .swatch {
    opacity: 0.35;
  }
  .only {
    visibility: hidden;
    background: none;
    border: 0;
    color: var(--accent-text);
    font-size: 11px;
    cursor: pointer;
    padding: 4px 6px;
  }
  .row:hover .only,
  .only:focus-visible {
    visibility: visible;
  }
  .note {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
</style>
