"""Build the JSON file the web app reads (web/src/lib/data.json).

Every entry in every collection becomes an item with an id of
"<collection>:<name>". Sub-entries (crystal varieties, color shades, full
moons by month) become items of their own with a `parent`, and they inherit
their parent's properties as well as having their own.

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

# Keys handled separately rather than shown as plain fields.
SPECIAL_KEYS = {"properties", "citation", *CHILD_KEYS}


def as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def make_item(collection, name, entry, parent=None):
    entry = entry or {}
    own = as_list(entry.get("properties"))
    inherited = [p for p in parent["properties"] if p not in own] if parent else []
    item = {
        "id": f"{collection}:{name}" if not parent else f"{parent['id']}/{name}",
        "name": name if not parent else f"{parent['name']} ({name})",
        "type": collection,
        "properties": sorted(set(own) | set(inherited)),
        "own": sorted(own),
        "fields": {k: v for k, v in entry.items() if k not in SPECIAL_KEYS},
        "citations": as_list(entry.get("citation")) or (parent["citations"] if parent else []),
        "children": [],
    }
    if parent:
        item["parent"] = parent["id"]
    return item


def build():
    items = {}
    for collection in collection_names():
        if collection in NOT_ITEMS:
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
    }


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    out.parent.mkdir(parents=True, exist_ok=True)
    data = build()
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {len(data['items'])} items to {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")


if __name__ == "__main__":
    main()
