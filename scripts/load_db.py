"""Load the YAML files in data/ into a local MongoDB database.

Each data file or folder becomes a collection named after it
(chakras.yml -> chakras, plants/ -> plants).
Each top-level key becomes one document with `_id` and `name` set to that key.
Re-running is safe: documents are upserted by `_id`.

Usage:
    python load_db.py [--uri URI] [--db NAME] [--drop]

MONGO_URI and MONGO_DB can be set in the environment or a .env file (see .env.example).
"""

import argparse
import os
from datetime import date, datetime, time

from dotenv import load_dotenv
from pymongo import MongoClient, ReplaceOne

from data_files import collection_names, read_collection

load_dotenv()


def to_bson(value):
    """YAML parses 2016-10-04 as a date, which BSON cannot encode; use a datetime."""
    if isinstance(value, date) and not isinstance(value, datetime):
        return datetime.combine(value, time.min)
    if isinstance(value, dict):
        return {k: to_bson(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_bson(v) for v in value]
    return value


def to_document(name, value):
    if value is None:
        value = {}
    elif not isinstance(value, dict):
        raise ValueError(f"unsupported value for '{name}': {type(value).__name__}")
    return {"_id": name, "name": name, **to_bson(value)}


def load_collection(db, collection_name, drop):
    data = read_collection(collection_name)
    collection = db[collection_name]
    if drop:
        collection.drop()
    docs = [to_document(str(name), value) for name, value in data.items()]
    if docs:
        collection.bulk_write([ReplaceOne({"_id": d["_id"]}, d, upsert=True) for d in docs])
    print(f"{collection_name}: {len(docs)} documents -> {db.name}.{collection.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--uri", default=os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    parser.add_argument("--db", default=os.getenv("MONGO_DB", "book_of_shadows"))
    parser.add_argument("--drop", action="store_true", help="drop each collection before loading")
    args = parser.parse_args()

    client = MongoClient(args.uri, serverSelectionTimeoutMS=5000)
    db = client[args.db]
    for name in collection_names():
        load_collection(db, name, args.drop)


if __name__ == "__main__":
    main()
