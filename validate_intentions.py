"""Check that every plant property is listed in intentions.py.

Usage:
    python validate_intentions.py
"""

import sys
from pathlib import Path

import yaml

from intentions import INTENTIONS

DATA_DIR = Path(__file__).parent / "data"


def main():
    intentions = set(INTENTIONS)
    plants = yaml.safe_load((DATA_DIR / "plants.yml").read_text()) or {}

    errors = []
    if INTENTIONS != sorted(INTENTIONS, key=str.lower) or len(intentions) != len(INTENTIONS):
        errors.append("intentions.py: INTENTIONS must be alphabetical with no duplicates")
    for name, plant in plants.items():
        if not (plant or {}).get("properties"):
            errors.append(f"plants.yml: {name}: has no properties")
        for prop in (plant or {}).get("properties", []):
            if prop not in intentions:
                errors.append(f"plants.yml: {name}: '{prop}' is not in intentions.py")

    if errors:
        print("\n".join(errors))
        print(f"\n{len(errors)} problem(s) found.")
        return 1
    print("All plant properties are in the intentions list.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
