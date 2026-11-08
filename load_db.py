"""Load the YAML files in data/ and bibliography/ into a local MongoDB database.

Each data file becomes a collection named after the file (plants.yml -> plants).
Each bibliography file becomes a collection prefixed with `bibliography_`
(bibliography/plants.yml -> bibliography_plants).
Each top-level key becomes one document with `_id` and `name` set to that key.
Re-running is safe: documents are upserted by `_id`.

Usage:
    python load_db.py [--uri URI] [--db NAME] [--drop]

MONGO_URI and MONGO_DB can be set in the environment or a .env file (see .env.example).
"""

import argparse
import os
from pathlib import Path

import yaml
from dotenv import load_dotenv
from pymongo import MongoClient, ReplaceOne

load_dotenv()

DATA_DIR = Path(__file__).parent / "data"
BIBLIOGRAPHY_DIR = Path(__file__).parent / "bibliography"


def to_document(name, value):
    if value is None:
        value = {}
    elif not isinstance(value, dict):
        raise ValueError(f"unsupported value for '{name}': {type(value).__name__}")
    return {"_id": name, "name": name, **value}


def load_file(db, path, collection_name, drop):
    with path.open() as f:
        data = yaml.safe_load(f) or {}

    collection = db[collection_name]
    if drop:
        collection.drop()
    docs = [to_document(str(name), value) for name, value in data.items()]
    if docs:
        collection.bulk_write([ReplaceOne({"_id": d["_id"]}, d, upsert=True) for d in docs])
    print(f"{path.name}: {len(docs)} documents -> {db.name}.{collection.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--uri", default=os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    parser.add_argument("--db", default=os.getenv("MONGO_DB", "book_of_shadows"))
    parser.add_argument("--drop", action="store_true", help="drop each collection before loading")
    args = parser.parse_args()

    client = MongoClient(args.uri, serverSelectionTimeoutMS=5000)
    db = client[args.db]
    for path in sorted(DATA_DIR.glob("*.yml")):
        load_file(db, path, path.stem, args.drop)
    for path in sorted(BIBLIOGRAPHY_DIR.glob("*.yml")):
        load_file(db, path, f"bibliography_{path.stem}", args.drop)


if __name__ == "__main__":
    main()
