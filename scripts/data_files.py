"""Read the YAML data in data/.

A collection is either a single file (data/chakras.yml) or a folder with one
file per entry (data/plants/acacia.yml). Each per-entry file holds one
top-level key, the entry's name, and is named after it (see slug()).
"""

import re
from pathlib import Path

import yaml

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def slug(name):
    """The filename (without .yml) for an entry: "adder's tongue" -> "adders-tongue"."""
    name = name.lower().replace("'", "").replace(".", "")
    return re.sub(r"[^a-z0-9]+", "-", name).strip("-")


def read_collection(name):
    """Return {entry name: entry} for data/<name>.yml or data/<name>/*.yml."""
    path = DATA_DIR / f"{name}.yml"
    if path.exists():
        return yaml.safe_load(path.read_text()) or {}

    folder = DATA_DIR / name
    if not folder.is_dir():
        raise FileNotFoundError(f"no collection '{name}': expected {path} or {folder}/")

    entries = {}
    for path in sorted(folder.glob("*.yml")):
        data = yaml.safe_load(path.read_text()) or {}
        if len(data) != 1:
            raise ValueError(f"{path}: must contain exactly one entry, found {len(data)}")
        (key, value), = data.items()
        key = str(key)
        if path.stem != slug(key):
            raise ValueError(f"{path}: entry '{key}' should be in {slug(key)}.yml")
        if key in entries:
            raise ValueError(f"{path}: duplicate entry '{key}'")
        entries[key] = value
    return entries


def collection_names():
    """Every collection in data/, from both single files and folders."""
    return sorted({p.stem for p in DATA_DIR.glob("*.yml")} | {p.name for p in DATA_DIR.iterdir() if p.is_dir()})
