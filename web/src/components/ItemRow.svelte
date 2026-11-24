<script>
  // One item in a list: dot, name, toxicity mark, optional type and match count, and one action.
  import { toxicityWarning } from '../lib/data.js'
  import { typeInfo, itemColor } from '../lib/types.js'

  let { item, selected = false, showType = false, matches = null, total = 0, note = '', action = 'remove', onselect, onaction } = $props()
</script>

<li class:selected>
  <span class="dot" style:background={itemColor(item)}></span>
  <button class="name" onclick={() => onselect(item.id)} title={matches?.join(', ') || undefined}>{item.name}</button>
  {#if toxicityWarning(item)}<span class="warn" title="Toxicity warning — see details">⚠</span>{/if}
  {#if showType}<span class="type">{typeInfo(item.type).label}</span>{/if}
  {#if matches && total}<span class="badge" class:none={!matches.length} title={matches.join(', ') || 'matches none of the intentions'}>{matches.length}/{total}</span>{/if}
  {#if note}<span class="note">{note}</span>{/if}
  <button class="action" class:add={action === 'add'} onclick={() => onaction(item.id)} aria-label="{action === 'add' ? 'Add' : 'Remove'} {item.name}"
    >{action === 'add' ? '+' : '×'}</button
  >
</li>

<style>
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    border-radius: 6px;
  }
  li:hover,
  li.selected {
    background: var(--surface-2);
  }
  li.selected {
    box-shadow: inset 2px 0 0 var(--accent);
  }
  .name {
    flex: 1;
    min-width: 0;
    text-align: left;
    background: none;
    border: 0;
    padding: 0;
    color: var(--text);
    font: inherit;
    cursor: pointer;
    text-transform: capitalize;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .type,
  .note {
    color: var(--muted);
    font-size: 12px;
    white-space: nowrap;
  }
  .note {
    font-size: 11px;
  }
  .action {
    background: none;
    border: 0;
    color: var(--muted);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 4px;
  }
  .action.add {
    color: var(--accent-text);
    font-size: 18px;
  }
</style>
