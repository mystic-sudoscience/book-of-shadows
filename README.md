# Book of Shadows

A community-maintained collection of correspondences (plants, crystals, elements, planetary days, and chakras) stored as plain YAML so it is easy to read, edit, and reuse. Contributions from practitioners of any path are welcome.

## Contents

| File | Description |
| --- | --- |
| [data/plants.yml](data/plants.yml) | Herbs and plants with their correspondences, safety notes, and uses |
| [data/crystals.yml](data/crystals.yml) | Crystals and their properties |
| [data/elements.yml](data/elements.yml) | Earth, air, fire, and water and what they govern |
| [data/weekdays.yml](data/weekdays.yml) | Days of the week, ruling planets, Norse deities, and properties |
| [data/chakras.yml](data/chakras.yml) | The seven chakras: color, location, meaning, and signs of blockage |
| [load_db.py](load_db.py) | Script that loads the YAML data into a local MongoDB database |

## How to contribute

1. Fork the repository and create a branch (`username/[update]`, etc.).
2. Edit the relevant YAML file, following the formatting rules and templates below.
3. Check that the file is still valid YAML (see [Validating your changes](#validating-your-changes)).
4. Add every source you used to [bibliography.md](bibliography.md) (see [Citations](#citations)).
5. Open a pull request describing what you added or changed and which sources support it.

You can add new entries, fill in missing fields on existing entries, fix errors, or add safety notes.

## Formatting rules

- Entry names and values are lowercase (`solar plexus`, not `Solar Plexus`).
- Keep entries in alphabetical order within each file.
- Multi-value fields are YAML lists (one `- item` per line). The exception is `parts used`, which is a comma-separated string.
- Omit fields you are unsure about rather than guessing. Partial entries are fine.
- Keep properties short (a word or short phrase).
- Quote values that contain special YAML characters such as `:` or `#`.

## Entry templates

### Plants (`plants.yml`)

```yaml
aconite:
  parts used: leaves, flowers
  planet: saturn
  element: water
  moon phase: waning
  zodiac sign: scorpio
  chakra: root
  properties:
    - consecration
    - protection
  notes:
    - poisonous to humans and pets
    - always wear gloves when handling
  holidays:
    - samhain
```

Only `parts used`, `planet`, `element`, and `properties` are typically present. `moon phase`, `zodiac sign`, `chakra`, `notes`, and `holidays` are optional.

Safety is important. If a plant is toxic, an irritant, or unsafe during pregnancy or for pets, say so in `notes`.

### Crystals (`crystals.yml`)

```yaml
crystal_name:
  properties:
    - property one
    - property two
```

Replace the `crystal_name` placeholder with the crystal's name. Additional fields (element, planet, chakra, cleansing notes) are welcome if you keep them consistent across entries.

### Elements (`elements.yml`)

```yaml
element:
  - purpose
```

### Weekdays (`weekdays.yml`)

```yaml
sunday:
  ruling planet: sun
  norse diety: sol
  properties:
    - healing
    - protection
```

Note that the existing key is spelled `norse diety`. Keep it as is until it is renamed across the whole file in a dedicated change.

### Chakras (`chakras.yml`)

```yaml
root:
  color: red
  location: base of the spine
  meaning:
    - grounding
  signs of blockage:
    - arthritis
```

## Validating your changes

With Python and PyYAML installed:

```sh
python -c "import yaml, sys; yaml.safe_load(open(sys.argv[1]))" data/plants.yml
```

No output means the file parsed successfully. Duplicate keys are silently overwritten by YAML parsers, so search the file for your entry name before adding it.

## Loading into MongoDB

The YAML files can be loaded into a local MongoDB database. You need a running MongoDB instance (for example `brew services start mongodb-community` on macOS) and Python 3.

```sh
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # then edit .env if your setup differs
python load_db.py
```

Configuration lives in `.env` (git-ignored; never commit it):

| Variable | Default | Description |
| --- | --- | --- |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string. Include credentials here if your instance requires auth. |
| `MONGO_DB` | `book_of_shadows` | Database to load into |

Command-line flags override `.env`, and real environment variables take precedence over `.env` values.

Each file in `data/` becomes a collection (`plants.yml` -> `plants`), and each top-level entry becomes a document whose `_id` and `name` are the entry name. The script is safe to re-run: documents are upserted. Options:

- `--uri` MongoDB connection string (overrides `MONGO_URI`)
- `--db` database name (overrides `MONGO_DB`)
- `--drop` drop each collection before loading, which also removes entries deleted from the YAML

Example query:

```sh
mongosh book_of_shadows --eval 'db.plants.find({planet: "venus"}, {name: 1})'
```

## Citations

**No new information may be added without a citation.** Every new entry, field, or edit must be backed by a source listed in [bibliography.md](bibliography.md). Pull requests without citations will not be merged.

- If your source is already in the bibliography, name it in your pull request.
- If it is new, add it to the matching section of [bibliography.md](bibliography.md). Format it with [MyBib](https://www.mybib.com/), as described at the top of that file.
- Personal practice (UPG) is valid but is not a citation. It does not belong in this repository unless a published source supports it.

## Sources and respect

- Correspondences vary between traditions. Note your tradition in the pull request if it is not widely agreed upon.
- Do not copy text verbatim from copyrighted books or websites. Summarize in your own words.
- Herbal and health information is for reference only and is not medical advice. Never recommend ingesting toxic plants.
- Be kind in discussions and reviews. Differing practices are not wrong practices.
