<script>
  import cytoscape from 'cytoscape'
  import { onMount } from 'svelte'

  /**
   * nodes: {id, label, kind: 'hub'|'item'|'intention'|'center', x, y, color?, shape?, size?, hub?, itemId?, name?, inSpell?}
   * edges: {id, source, target, hub?, relation?}
   */
  let { nodes, edges, selected = null, onselect, onfocus, onintention, onadditem } = $props()

  let container

  // Below this zoom, item labels are too small to read and only add clutter.
  // Done by hand rather than with Cytoscape's min-zoomed-font-size, which
  // behaves differently across browsers on high-density (Retina) screens.
  const LABEL_ZOOM = 0.6
  let cy = $state.raw(null)

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

  function stylesheet() {
    const bg = css('--bg')
    const text = css('--text')
    return [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          color: text,
          // Cytoscape's font-family parser rejects single quotes.
          'font-family': css('--font-ui').replaceAll("'", '"'),
          'font-size': 12,
          'text-valign': 'bottom',
          'text-margin-y': 4,
          'text-outline-color': bg,
          'text-outline-width': 2,
          'text-max-width': 90,
          'text-wrap': 'ellipsis',
          'background-color': 'data(color)',
          shape: 'data(shape)',
          width: 'data(size)',
          height: 'data(size)',
          'border-width': 1,
          'border-color': css('--node-ring'),
          'transition-property': 'opacity',
          'transition-duration': '150ms',
        },
      },
      {
        selector: 'node[kind = "hub"], node[kind = "center"]',
        style: {
          'font-size': 15,
          'font-weight': 600,
          'text-valign': 'center',
          'text-margin-y': 0,
          'text-max-width': 120,
          'text-wrap': 'wrap',
          'border-width': 3,
          'border-color': bg,
          color: css('--hub-text'),
          'text-outline-width': 0,
          'z-index': 10,
        },
      },
      {
        selector: 'node[kind = "intention"]',
        style: {
          'background-color': css('--intention'),
          'font-size': 11,
          'border-color': bg,
        },
      },
      {
        selector: 'node.inspell',
        style: { 'border-width': 3, 'border-color': css('--accent'), 'border-style': 'double' },
      },
      {
        selector: 'node.selected',
        style: {
          'border-width': 4,
          'border-color': css('--accent'),
          'font-weight': 600,
          'font-size': 12,
          'z-index': 20,
        },
      },
      {
        selector: 'edge',
        style: {
          'curve-style': 'haystack',
          width: 1,
          'line-color': css('--edge'),
          opacity: 0.5,
        },
      },
      ...[0, 1, 2, 3, 4].map((i) => ({ selector: `node[kind = "hub"][hub = ${i}]`, style: { 'background-color': css(`--hub-${i}`) } })),
      ...[0, 1, 2, 3, 4].map((i) => ({ selector: `edge[hub = ${i}]`, style: { 'line-color': css(`--hub-${i}`), opacity: 0.35 } })),
      {
        selector: 'edge[link]',
        style: { 'curve-style': 'straight', 'line-color': css('--accent'), opacity: 0.3 },
      },
      {
        selector: 'edge[relation]',
        style: { 'curve-style': 'straight', 'line-style': 'dashed', width: 1.5, opacity: 0.8 },
      },
      { selector: '.faded', style: { opacity: 0.12 } },
      { selector: 'edge.hl', style: { opacity: 0.9, width: 2 } },
      { selector: 'node.hl', style: { 'z-index': 15 } },
      // Item labels are hidden when zoomed out (see updateLabels), except the hovered or selected one.
      { selector: 'node.nolabel', style: { 'text-opacity': 0 } },
      { selector: 'node.hover, node.selected', style: { 'text-opacity': 1, 'z-index': 25 } },
    ]
  }

  onMount(() => {
    const instance = cytoscape({
      container,
      style: stylesheet(),
      layout: { name: 'preset' },
      minZoom: 0.1,
      maxZoom: 3,
      boxSelectionEnabled: false,
      autoungrabify: false,
    })

    instance.on('tap', 'node', (e) => {
      const d = e.target.data()
      if (d.kind === 'intention') onintention?.(d.name, e.originalEvent?.shiftKey)
      else if (d.itemId && e.originalEvent?.shiftKey && d.kind !== 'hub') onadditem?.(d.itemId)
      else if (d.itemId) onselect?.(d.itemId)
    })
    instance.on('dbltap', 'node', (e) => {
      const d = e.target.data()
      if (d.itemId && d.kind !== 'center') onfocus?.(d.itemId)
    })
    instance.on('mouseover', 'node', (e) => {
      instance.batch(() => {
        instance.elements().addClass('faded')
        e.target.closedNeighborhood().removeClass('faded').addClass('hl')
        e.target.addClass('hover')
      })
      container.style.cursor = 'pointer'
    })
    instance.on('mouseout', 'node', () => {
      instance.batch(() => instance.elements().removeClass('faded hl hover'))
      container.style.cursor = ''
    })

    instance.on('zoom', () => updateLabels(instance))

    const restyle = () => instance.style(stylesheet())
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', restyle)
    const observer = new MutationObserver(restyle)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    cy = instance
    return () => {
      mq.removeEventListener('change', restyle)
      observer.disconnect()
      instance.destroy()
    }
  })

  // Redraw whenever the set of nodes changes.
  $effect(() => {
    if (!cy) return
    const els = [
      ...nodes.map((n) => ({
        group: 'nodes',
        data: { ...n, color: n.color ?? '#888888' },
        position: { x: n.x, y: n.y },
        classes: n.inSpell ? 'inspell' : '',
      })),
      ...edges.map((e) => ({ group: 'edges', data: e })),
    ]
    cy.batch(() => {
      cy.elements().remove()
      cy.add(els)
    })
    cy.fit(undefined, 40)
    // Small webs shouldn't be blown up to fill the screen.
    if (cy.zoom() > 1.1) cy.zoom({ level: 1.1, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } })
    cy.center()
    updateLabels(cy, true)
    markSelected()
  })

  let labelsShown = null
  function updateLabels(instance, force = false) {
    const show = instance.zoom() >= LABEL_ZOOM
    if (show === labelsShown && !force) return
    labelsShown = show
    const items = instance.nodes('[kind = "item"]')
    instance.batch(() => (show ? items.removeClass('nolabel') : items.addClass('nolabel')))
  }

  function markSelected() {
    if (!cy) return
    cy.nodes('.selected').removeClass('selected')
    if (selected) cy.nodes().filter((n) => n.data('itemId') === selected && n.data('kind') !== 'center').addClass('selected')
  }

  $effect(() => {
    selected
    markSelected()
  })

  export function fit() {
    cy?.animate({ fit: { padding: 40 } }, { duration: 250 })
  }
  export function zoomBy(factor) {
    if (!cy) return
    cy.animate({ zoom: { level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } } }, { duration: 150 })
  }
</script>

<div class="graph" bind:this={container}></div>

<style>
  .graph {
    position: absolute;
    inset: 0;
  }
</style>
