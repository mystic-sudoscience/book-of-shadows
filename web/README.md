# Spell Web

A browser front end for the correspondence data in `../data`. Pick an intention to see every item that corresponds to it, add up to three intentions to see what they share, and collect items into a list of spell components.

## Running it

Needs Node 20+ and the project's Python environment (`../.venv` with PyYAML).

```sh
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

`dev` and `build` first run `scripts/build_web_data.py`, which reads the YAML and writes `src/lib/data.json` (gitignored). To use a different Python, set `PYTHON=/path/to/python`.

## How it works

- **Views are in the URL**, so back/forward and bookmarks work: `#/i/love/money` is the web for love + money, `#/item/plants%3Ablackberry` is the web centred on blackberry.
- **Linking:** an item belongs to an intention when the intention is in its `properties`. Varieties, shades and full moons by month become items of their own, and they inherit their parent's properties.
- **Layout** (`src/lib/layout.js`) places every node itself. With one intention, items fan out in one petal per type. With two or three, items shared by all of them sit in the centre, items shared by two sit between those hubs, and items matching only one fan out on the outer side of its hub.
- The type filters and the spell list are saved in the browser (localStorage).

| File | Purpose |
| --- | --- |
| `src/App.svelte` | Page layout, routing, and building the graph for the current view |
| `src/components/Graph.svelte` | Cytoscape.js canvas |
| `src/components/Details.svelte` | Everything about one item |
| `src/components/Spell.svelte` | Chosen components and their shared correspondences |
| `src/lib/types.js` | Label, color and shape for each collection |
