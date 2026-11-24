"""Build the JSON file the web app reads (web/src/lib/data.json).

Every entry in every collection becomes an item with an id of
"<collection>:<name>". Sub-entries (crystal varieties, color shades, full
moons by month) become items of their own with a `parent`, and they inherit
their parent's properties as well as having their own.

Items link to each other through their `correspondences` (and plants' planet,
element, zodiac sign, chakra, moon phase, and holidays fields). Each item gets
`links` (what it names) and `linkedFrom` (what names it), as item ids.

Usage: python scripts/build_web_data.py [output path]
"""

import json
import sys
from pathlib import Path

from data_files import collection_names, read_collection
from intentions import INTENTIONS

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "web" / "src" / "lib" / "data.json"

# Keys whose value is a dict of sub-entries, each becoming its own item.
CHILD_KEYS = ("varieties", "shades", "months")

# Files in data/ that describe the data rather than hold items.
NOT_ITEMS = {"bibliography", "intention_groups"}

# Collections kept in the data but not shown in the app yet.
NOT_IN_APP = {"deities"}

# Keys handled separately rather than shown as plain fields.
SPECIAL_KEYS = {"properties", "core properties", "citation", "correspondences", *CHILD_KEYS}

# Older plant fields that also name items in another collection.
FIELD_LINKS = {"planet": "planets", "ruling planet": "planets", "element": "elements", "zodiac sign": "zodiac",
               "chakra": "chakras", "moon phase": "moon", "holidays": "holidays", "color": "colors"}


def as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def make_item(collection, name, entry, parent=None):
    entry = entry or {}
    own = as_list(entry.get("properties"))
    inherited = [p for p in parent["properties"] if p not in own] if parent else []
    # Focused mode: `core properties` when given, else the full list; varieties inherit the parent's core.
    own_core = as_list(entry.get("core properties")) or own
    inherited_core = [p for p in parent["core"] if p not in own_core] if parent else []
    item = {
        "id": f"{collection}:{name}" if not parent else f"{parent['id']}/{name}",
        "name": name if not parent else f"{parent['name']} ({name})",
        "type": collection,
        "properties": sorted(set(own) | set(inherited)),
        "core": sorted(set(own_core) | set(inherited_core)),
        "own": sorted(own),
        "fields": {k: v for k, v in entry.items() if k not in SPECIAL_KEYS},
        "citations": as_list(entry.get("citation")) or (parent["citations"] if parent else []),
        "children": [],
        "correspondences": {c: [str(n) for n in as_list(v)] for c, v in (entry.get("correspondences") or {}).items()},
    }
    for field, coll in FIELD_LINKS.items():
        for value in as_list(entry.get(field)):
            for v in str(value).split(","):
                if v.strip():
                    item["correspondences"].setdefault(coll, []).append(v.strip().lower())
    if parent:
        item["parent"] = parent["id"]
    return item


def item_id(collection, name, items):
    """'cattle (cow)' -> 'animals:cattle/cow' when that variety exists, else 'animals:cattle'."""
    name = name.lower().strip()
    if f"{collection}:{name}" in items:
        return f"{collection}:{name}"
    if "(" in name:
        base, sub = name.split("(", 1)
        base, sub = base.strip(), sub.rstrip(")").strip()
        for candidate in (f"{collection}:{base}/{sub}", f"{collection}:{base}"):
            if candidate in items:
                return candidate
    return None


def link_items(items):
    """Resolve correspondences to item ids, both ways. Unresolved names stay visible as text."""
    for item in items.values():
        item["links"] = []
        item["linkedFrom"] = []
    for item in items.values():
        resolved = {}
        for coll, names in item["correspondences"].items():
            resolved[coll] = []
            for n in dict.fromkeys(names):
                target = item_id(coll, n, items)
                resolved[coll].append({"name": n, "id": target})
                if target and target != item["id"] and target not in item["links"]:
                    item["links"].append(target)
                    items[target]["linkedFrom"].append(item["id"])
        item["correspondences"] = resolved


def build():
    items = {}
    for collection in collection_names():
        if collection in NOT_ITEMS or collection in NOT_IN_APP:
            continue
        for name, entry in read_collection(collection).items():
            if entry is not None and not isinstance(entry, dict):
                print(f"warning: skipping {collection}: '{name}' is not a mapping", file=sys.stderr)
                continue
            item = make_item(collection, str(name), entry)
            items[item["id"]] = item
            for key in CHILD_KEYS:
                for child_name, child_entry in ((entry or {}).get(key) or {}).items():
                    child = make_item(collection, str(child_name), child_entry, parent=item)
                    child["relation"] = key
                    items[child["id"]] = child
                    item["children"].append(child["id"])

    link_items(items)

    bibliography = {
        key: (value or {}).get("citation") or (value or {}).get("title") or key
        for key, value in read_collection("bibliography").items()
    }

    unknown = sorted({p for it in items.values() for p in it["properties"]} - set(INTENTIONS))
    if unknown:
        print(f"warning: {len(unknown)} properties not in INTENTIONS: {', '.join(unknown[:10])}", file=sys.stderr)

    groups_path = ROOT / "data" / "intention_groups.yml"
    groups = read_collection("intention_groups") if groups_path.exists() else {}

    return {
        "intentions": INTENTIONS,
        "groups": {k: v or [] for k, v in groups.items()},
        "items": list(items.values()),
        "bibliography": bibliography,
        # Fields whose values name items in another collection; the app reads this rather than repeating it.
        "fieldLinks": FIELD_LINKS,
    }


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    out.parent.mkdir(parents=True, exist_ok=True)
    data = build()
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {len(data['items'])} items to {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")


if __name__ == "__main__":
    main()
