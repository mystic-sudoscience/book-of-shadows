"""Check that every property in the checked collections is listed in intentions.py.

Usage:
    python validate_intentions.py
"""

import sys

from data_files import DATA_DIR, read_collection, slug
from intentions import INTENTIONS

# Collections whose `properties` must be intentions, including the nested
# properties under colors' `shades`, crystals' `varieties`, and the full moon's `months`.
NESTED = ("shades", "varieties", "months")
CHECKED = ["chakras", "colors", "crystals", "directions", "holidays", "metals", "moon", "numbers", "planets", "plants", "seasons", "tarot", "times", "weekdays", "zodiac"]


def location(collection, name):
    if (DATA_DIR / collection).is_dir():
        return f"{collection}/{slug(name)}.yml"
    return f"{collection}.yml: {name}"


def check(where, entry, intentions, errors):
    if not (entry or {}).get("properties"):
        errors.append(f"{where}: has no properties")
    for prop in (entry or {}).get("properties", []):
        if prop not in intentions:
            errors.append(f"{where}: '{prop}' is not in intentions.py")


def main():
    intentions = set(INTENTIONS)
    errors = []
    if INTENTIONS != sorted(INTENTIONS, key=str.lower) or len(intentions) != len(INTENTIONS):
        errors.append("intentions.py: INTENTIONS must be alphabetical with no duplicates")

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
