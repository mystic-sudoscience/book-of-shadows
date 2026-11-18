"""Check that every property in the checked collections is listed in intentions.py.

Usage:
    python validate_intentions.py
"""

import sys

import yaml

from data_files import DATA_DIR, read_collection, slug
from intentions import INTENTIONS

# Collections an entry's `correspondences` may point into ("sea" is From the Sea items, not yet a collection).
LINKABLE = {"animals", "chakras", "colors", "crystals", "deities", "directions", "elements", "holidays", "imagery", "metals", "moon",
            "numbers", "planets", "plants", "sea", "seasons", "tarot", "times", "weekdays", "zodiac"}

# Collections whose `properties` must be intentions, including the nested
# properties under colors' `shades`, crystals' `varieties`, and the full moon's `months`.
NESTED = ("shades", "varieties", "months")
CHECKED = ["animals", "chakras", "deities", "colors", "crystals", "directions", "elements", "holidays", "imagery", "metals", "moon", "numbers", "planets", "plants", "seasons", "tarot", "times", "weekdays", "zodiac"]


def location(collection, name):
    if (DATA_DIR / collection).is_dir():
        return f"{collection}/{slug(name)}.yml"
    return f"{collection}.yml: {name}"


def check(where, entry, intentions, errors):
    if not (entry or {}).get("properties") and not (entry or {}).get("correspondences"):
        errors.append(f"{where}: has no properties")
    links = (entry or {}).get("correspondences") or {}
    if not isinstance(links, dict):
        errors.append(f"{where}: correspondences must map a collection to a list of names")
        links = {}
    for coll, names in links.items():
        if coll not in LINKABLE:
            errors.append(f"{where}: correspondences: unknown collection '{coll}'")
        if not isinstance(names, list) or not all(isinstance(n, (str, int)) for n in names):
            errors.append(f"{where}: correspondences: {coll} must be a list of names")
    props = (entry or {}).get("properties", []) or []
    for prop in props:
        if prop not in intentions:
            errors.append(f"{where}: '{prop}' is not in intentions.py")
    # `core properties`: the focused subset shown in the app's Focused mode.
    for prop in (entry or {}).get("core properties", []) or []:
        if prop not in props:
            errors.append(f"{where}: core property '{prop}' is not in its properties")


def check_groups(intentions, errors):
    """Check data/intention_groups.yml: known intentions, sorted, and no loops."""
    path = DATA_DIR / "intention_groups.yml"
    if not path.exists():
        return
    groups = yaml.safe_load(path.read_text()) or {}
    if list(groups) != sorted(groups):
        errors.append("intention_groups.yml: groups must be in alphabetical order")
    for group, members in groups.items():
        members = members or []
        for name in [group, *members]:
            if name not in intentions:
                errors.append(f"intention_groups.yml: '{name}' is not in intentions.py")
        if group in members:
            errors.append(f"intention_groups.yml: '{group}' lists itself")
        if members != sorted(set(members)):
            errors.append(f"intention_groups.yml: {group}: members must be alphabetical with no duplicates")

    def loops_back(start, node, seen):
        for member in groups.get(node) or []:
            if member == start:
                return True
            if member in groups and member not in seen:
                seen.add(member)
                if loops_back(start, member, seen):
                    return True
        return False

    for group in groups:
        if loops_back(group, group, set()):
            errors.append(f"intention_groups.yml: '{group}' contains itself through a nested group")


def main():
    intentions = set(INTENTIONS)
    errors = []
    if INTENTIONS != sorted(INTENTIONS, key=str.lower) or len(intentions) != len(INTENTIONS):
        errors.append("intentions.py: INTENTIONS must be alphabetical with no duplicates")
    check_groups(intentions, errors)

    for collection in CHECKED:
        try:
            entries = read_collection(collection)
        except ValueError as e:
            errors.append(str(e))
            continue
        for name, entry in entries.items():
            where = location(collection, name)
            nested = {k: v for key in NESTED for k, v in ((entry or {}).get(key) or {}).items()}
            if not nested or (entry or {}).get("properties"):
                check(where, entry, intentions, errors)
            for sub, sub_entry in nested.items():
                check(f"{where}: {sub}", sub_entry, intentions, errors)

    if errors:
        print("\n".join(errors))
        print(f"\n{len(errors)} problem(s) found.")
        return 1
    print(f"All {', '.join(CHECKED)} properties are in the intentions list.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
