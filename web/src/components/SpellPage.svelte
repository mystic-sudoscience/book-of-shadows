<script>
  // The spell workspace: name, intentions, components, balance, and ideas to add.
  import ItemRow from './ItemRow.svelte'
  import Chip from './Chip.svelte'
  import Balance from './Balance.svelte'
  import { toxicityWarning, matchingProps, relatedTo, groupCountFor, intentions as allIntentions } from '../lib/data.js'
  import { typeInfo } from '../lib/types.js'
  import { sharedCorrespondences, bestDay as findBestDay, suggestions } from '../lib/spell.js'
  import { spell } from '../lib/state.svelte.js'

  let { exact = false, selectedId = null, onselect, onexplore, onview } = $props()

  const items = $derived(spell.items)
  const intentions = $derived(spell.intentions)
  const matchesOf = (it) => intentions.filter((a) => matchingProps(it, a, exact).length)
  const shared = $derived(sharedCorrespondences(items))
  const bestDay = $derived(findBestDay(shared))
  const uncovered = $derived(intentions.filter((a) => !items.some((it) => matchingProps(it, a, exact).length)))
  const ideas = $derived(suggestions(items, intentions, exact))
  const related = (a) => (exact ? [] : [...relatedTo(a)].slice(1))
  let showAllIdeas = $state(false)
  const starters = allIntentions.slice(0, 12)

  let copied = $state(false)
  async function copy() {
    const lines = [
      spell.name || null,
      intentions.length ? `Intention: ${intentions.join(', ')}` : null,
      '',
      ...items.map((it) => `- ${it.name} (${typeInfo(it.type).label.toLowerCase()})${toxicityWarning(it) ? ' ⚠ toxic' : ''}`),
      bestDay ? `\nDay: ${bestDay.day.name} (${bestDay.planet})` : null,
    ].filter((l) => l !== null)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      copied = true
      setTimeout(() => (copied = false), 1500)
    } catch {
      // clipboard unavailable
    }
  }
</script>

<div class="page">
  <header class="head">
    <input class="title" value={spell.name} placeholder="Untitled spell" aria-label="Spell name" oninput={(e) => (spell.name = e.currentTarget.value)} />
    {#if items.length}
      <div class="tools">
        <button class="btn" onclick={onview}>View as web</button>
        <button class="btn" onclick={copy}>{copied ? 'Copied' : 'Copy list'}</button>
        <button class="btn" onclick={spell.clear}>Clear</button>
      </div>
    {/if}
  </header>

  <section>
    <h3 class="label">Intentions</h3>
    {#if intentions.length}
      <div class="chips">
        {#each intentions as a (a)}
          <Chip color={uncovered.includes(a) ? null : 'var(--accent)'} dot={false} dashed={uncovered.includes(a)} more={related(a)} onremove={() => spell.removeIntention(a)} removeLabel="Remove {a}"
            >{a}</Chip
          >
        {/each}
        <button class="btn pill" onclick={onexplore} title="Open these intentions in the explorer web">Explore in web →</button>
      </div>
      <p class="muted">Add more from the search box above.</p>
    {:else}
      <p class="muted">What is this spell for? Search above, or start with one of these:</p>
      <div class="chips">
        {#each starters as s (s)}
          <button class="btn pill" onclick={() => spell.addIntention(s)}>{s} <span class="muted">{groupCountFor(s)}</span></button>
        {/each}
      </div>
    {/if}
  </section>

  <section>
    <h3 class="label">Components <span class="n">{items.length}</span></h3>
    {#if !items.length}
      <p class="muted">Nothing yet. Add from the ideas below, search for an item, or find things in <button class="link" onclick={onexplore}>Explore</button>.</p>
    {:else}
      <ul class="components">
        {#each items as it (it.id)}
          <ItemRow
            item={it}
            selected={selectedId === it.id}
            showType
            matches={intentions.length ? matchesOf(it) : null}
            total={intentions.length}
            {onselect}
            onaction={spell.remove}
          />
        {/each}
      </ul>
      {#if uncovered.length}
        <p class="muted">Nothing here covers <strong>{uncovered.join(', ')}</strong> yet.</p>
      {/if}
    {/if}
  </section>

  {#if items.length}
    <section class="grid">
      <div>
        <h3 class="label">Balance</h3>
        <Balance {items} {onselect} />
      </div>
      {#if shared.length}
        <div>
          <h3 class="label">Shared correspondences</h3>
          <ul class="shared">
            {#each shared.slice(0, 8) as s (s.kind + s.value)}
              <li>
                <span class="kind">{s.kind}</span>
                {#if s.id}<button class="link" onclick={() => onselect(s.id)}>{s.value}</button>{:else}{s.value}{/if}
                <span class="n">×{s.n}</span>
              </li>
            {/each}
          </ul>
          {#if bestDay}
            <p class="muted">
              Most items share <strong>{bestDay.planet}</strong>, which rules
              <button class="link" onclick={() => onselect(bestDay.day.id)}>{bestDay.day.name}</button>.
            </p>
          {/if}
        </div>
      {/if}
    </section>
  {/if}

  {#if intentions.length}
    <section>
      <h3 class="label">Ideas to add</h3>
      {#if !ideas.length}
        <p class="muted">Nothing else matches these intentions.</p>
      {:else}
        <p class="muted">Best matches for your intentions{items.length ? ', favouring ones that fill a missing chakra or element' : ''}.</p>
        <div class="ideas">
          {#each showAllIdeas ? ideas : ideas.slice(0, 6) as g (g.type)}
            <div>
              <h4><span class="dot" style:background={typeInfo(g.type).color}></span>{typeInfo(g.type).label}</h4>
              <ul>
                {#each g.list as s (s.item.id)}
                  <ItemRow
                    item={s.item}
                    selected={selectedId === s.item.id}
                    matches={intentions.length > 1 ? s.matches : null}
                    total={intentions.length}
                    note={s.fills.length ? `+${s.fills[0]}${s.fills.length > 1 ? '…' : ''}` : ''}
                    action="add"
                    {onselect}
                    onaction={spell.add}
                  />
                {/each}
              </ul>
            </div>
          {/each}
        </div>
        {#if ideas.length > 6}
          <button class="link" onclick={() => (showAllIdeas = !showAllIdeas)}>{showAllIdeas ? 'Show fewer types' : `Show all ${ideas.length} types`}</button>
        {/if}
      {/if}
    </section>
  {/if}
</div>

<style>
  .page {
    max-width: 880px;
    margin: 0 auto;
    padding: 20px 24px 48px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .title {
    flex: 1;
    min-width: 200px;
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 600;
    border: 0;
    border-bottom: 1px dashed transparent;
    background: none;
    color: var(--text);
    padding: 2px 0;
  }
  .title:hover,
  .title:focus {
    border-bottom-color: var(--border);
    outline: none;
  }
  .tools {
    display: flex;
    gap: 6px;
  }
  section,
  .grid > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  p {
    margin: 0;
  }
  h4 {
    margin: 0 0 4px;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .n {
    color: var(--muted);
    font-weight: 400;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .pill {
    border-radius: 999px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .components {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 4px;
    background: var(--surface);
  }
  .shared li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 6px;
  }
  .kind {
    width: 92px;
    flex: none;
    color: var(--muted);
    font-size: 12px;
  }
  .shared .n {
    margin-left: auto;
  }
  .link {
    align-self: flex-start;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
  }
  .ideas {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 12px 20px;
  }
  @media (max-width: 600px) {
    .page {
      padding: 16px 16px 40px;
    }
    .title {
      font-size: 24px;
    }
  }
</style>
