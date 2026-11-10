# Book of Shadows

A community-maintained collection of correspondences (plants, crystals, elements, planetary days, and chakras) stored as plain YAML so it is easy to read, edit, and reuse. Contributions from practitioners of any path are welcome.

## Contents

| File                                  | Description                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------- |
| [data/plants.yml](data/plants.yml)     | Herbs and plants with their correspondences, safety notes, and uses         |
| [data/crystals.yml](data/crystals.yml) | Crystals and their properties                                               |
| [data/elements.yml](data/elements.yml) | Earth, air, fire, and water and what they govern                            |
| [data/weekdays.yml](data/weekdays.yml) | Days of the week, ruling planets, Norse deities, and properties             |
| [data/chakras.yml](data/chakras.yml)   | The seven chakras: color, location, meaning, and signs of blockage          |
| [data/bibliography.yml](data/bibliography.yml) | Every source, keyed by a short id that entries reference in `citation` |
| [load_db.py](load_db.py)               | Script that loads the YAML data into a local MongoDB database               |

## How to contribute

1. Fork the repository and create a branch (`username/[update]`, etc.).
2. Edit the relevant YAML file, following the formatting rules and templates below.
3. Check your changes pass the linter (see [Validating your changes](#validating-your-changes)).
4. Add every source you used to [data/bibliography.yml](data/bibliography.yml) and reference its id in the entry's `citation` list (see [Citations](#citations)).
5. Open a pull request describing what you added or changed and which sources support it.

You can add new entries, fill in missing fields on existing entries, fix errors, or add safety notes.

## Formatting rules

- Two-space indentation. No tabs, no trailing spaces, and a newline at the end of the file (enforced by yamllint).
- Entry names and values are lowercase (`solar plexus`, not `Solar Plexus`).
- Keep entries in alphabetical order within each file.
- Multi-value fields are YAML lists (one `- item` per line). The exception is `parts used`, which is a comma-separated string.
- Omit fields you are unsure about rather than guessing. Partial entries are fine.
- Keep properties short (a word or short phrase).
- Do not use parentheses in properties. Write plain phrases instead (`inner calm`, not `calm (inner)`; `release attachments`, not `attachments (release)`).
- Quote values that contain special YAML characters such as `:` or `#`.

## Entry templates

### Plants (`plants.yml`)

```yaml
aconite:
  type: herb & garden
  parts used: leaves, flowers
  planet: saturn
  element: water
  moon phase: waning
  zodiac sign: scorpio
  chakra: root
  properties:
    - consecrate/bless
    - protection
  toxicity:
    humans: true
    pets: true
    notes:
      - always wear gloves when handling
  holidays:
    - samhain
  citation:
    - morgana-green-witch
```

`type` is one of `tree`, `herb & garden`, or `misc` (the categories used in
*Llewellyn's Complete Book of Correspondences*). Leave it out if unsure.

Only `parts used`, `planet`, `element`, `properties`, and `citation` are typically present. `moon phase`, `zodiac sign`, `chakra`, `toxicity`, `notes`, and `holidays` are optional.

Safety is important. Record it in `toxicity`:

- `humans` and `pets` are booleans: `true` if the plant is toxic to that group, `false` if it is nontoxic. Omit a key if your source does not say.
- `notes` elaborates on details such as whether small amounts can be consumed, whether gloves should be worn, skin irritation, or pregnancy cautions.

Use the plant's regular `notes` for anything that is not about safety.

Every item in `properties` must be an intention listed in [intentions.py](intentions.py). If the intention you need is missing, add it there (lowercase, no parentheses, alphabetical order) before using it on a plant. `python validate_intentions.py` reports any property that is not in the list.

### Crystals (`crystals.yml`)

```yaml
crystal_name:
  properties:
    - property one
    - property two
```

Replace the `crystal_name` placeholder with the crystal's name. Additional fields (element, planet, chakra, cleansing notes) are welcome if you keep them consistent across entries. Crystals do not have a source yet: add the source to `data/bibliography.yml` and add a `citation` list to the entry, as described in [Citations](#citations).

### Elements (`elements.yml`)

```yaml
element:
  properties:
    - purpose
  citation:
    - cunningham-herbs
```

`citation` is a list of ids from `data/bibliography.yml`.

### Weekdays (`weekdays.yml`)

```yaml
sunday:
  ruling planet: sun
  norse diety: sol
  properties:
    - healing
    - protection
  citation:
    - cunningham-herbs
```

`citation` is a list of ids from `data/bibliography.yml`.

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
  citation:
    - healthline-chakras
```

## Validating your changes

Install the dependencies in a virtual environment, then lint with [yamllint](https://yamllint.readthedocs.io/) (rules in [.yamllint](.yamllint)):

```sh
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
yamllint --strict -c .yamllint data
```

yamllint checks syntax, 2-space indentation, trailing spaces, a final newline, spacing after colons, and duplicate keys (which YAML parsers otherwise silently overwrite).

### Pre-commit

[pre-commit](https://pre-commit.com/) runs yamllint on `data/` and checks that plant properties are in the intentions list automatically. A commit that fails is rejected until the file is fixed.

```sh
pre-commit install          # once, to run the checks on each commit
pre-commit run --all-files  # run them manually
```

## Loading into MongoDB

The YAML files can be loaded into a local MongoDB database. You need a running MongoDB instance (for example `brew services start mongodb-community` on macOS) and the virtual environment from [Validating your changes](#validating-your-changes).

```sh
cp .env.example .env    # then edit .env if your setup differs
python load_db.py
```

Configuration lives in `.env` (git-ignored; never commit it):

| Variable      | Default                       | Description                                                                         |
| ------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string. Include credentials here if your instance requires auth. |
| `MONGO_DB`  | `book_of_shadows`           | Database to load into                                                               |

Command-line flags override `.env`, and real environment variables take precedence over `.env` values.

Each file in `data/` becomes a collection (`plants.yml` -> `plants`, `bibliography.yml` -> `bibliography`). Each top-level entry becomes a document whose `_id` and `name` are the entry name, so a `citation` id such as `cunningham-herbs` matches the `_id` of a document in `bibliography`. The script is safe to re-run: documents are upserted. Options:

- `--uri` MongoDB connection string (overrides `MONGO_URI`)
- `--db` database name (overrides `MONGO_DB`)
- `--drop` drop each collection before loading, which also removes entries deleted from the YAML

Example query:

```sh
mongosh book_of_shadows --eval 'db.plants.find({planet: "venus"}, {name: 1})'
```

## Citations

**No new information may be added without a citation.** Every new entry, field, or edit must be backed by a source in [data/bibliography.yml](data/bibliography.yml). Pull requests without citations will not be merged.

### How citations work

All sources live in one file, [data/bibliography.yml](data/bibliography.yml). Each source has a short, descriptive id (`cunningham-herbs`, `healthline-chakras`, ...) and is reused by any entry in any file that draws on it:

```yaml
cunningham-herbs:
  author:
    last: Cunningham
    first: Scott
  title: Cunningham’s Encyclopedia of Magical Herbs
  publisher: Llewellyn Publications
  year: 1985
  citation: Cunningham, Scott. Cunningham’s Encyclopedia of Magical Herbs. Llewellyn Publications, 1985.
```

A data entry lists the ids of its sources in `citation`, always as the last field and always as a list:

```yaml
sunday:
  ruling planet: sun
  properties:
    - healing
  citation:
    - cunningham-herbs
    - vikingeskibsmuseet-weekdays
```

### Adding a source

1. Add a new entry to `data/bibliography.yml` with a short id of the form `author-topic` (lowercase, hyphenated), in alphabetical order.
2. Include the fields that apply: `author` (`last`, `first`), `title`, `publisher` or `website`, `year` or `date`, `url`, and `accessed`.
3. Put the full MLA string in `citation`. [MyBib](https://www.mybib.com/) can format it.
4. Quote any value containing `: ` or `#`, which is common in titles and MLA strings.
5. Add the id to the `citation` list of every data entry the source supports.

If your source is already in the bibliography, just reference its id; do not add it again. A new source gets a new id and is added to the entries it supports alongside the existing ids.

For plants, entries with a `zodiac sign` are credited to `morgana-green-witch` and entries without one to `cunningham-herbs`. When your source supports a plant, add its id as well.

### Rules

- Personal practice (UPG) is valid but is not a citation. It does not belong in this repository unless a published source supports it.
- Only cite what the source says; do not cite a source for information it does not contain.

## Sources and respect

- Correspondences vary between traditions. Note your tradition in the pull request if it is not widely agreed upon.
- Do not copy text verbatim from copyrighted books or websites. Summarize in your own words.
- Herbal and health information is for reference only and is not medical advice. Never recommend ingesting toxic plants.
- Be kind in discussions and reviews. Differing practices are not wrong practices.
