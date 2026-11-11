# Book of Shadows

A community-maintained collection of correspondences (plants, crystals, colors, metals, moon phases, elements, planetary days, times of day, directions, numbers, holidays, planets, seasons, zodiac signs, tarot, and chakras) stored as plain YAML so it is easy to read, edit, and reuse. Contributions from practitioners of any path are welcome.

## Contents

| File                                  | Description                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------- |
| [data/plants/](data/plants/)           | Herbs and plants with their correspondences, safety notes, and uses (one file per plant) |
| [data/crystals.yml](data/crystals.yml) | Crystals, gemstones, and minerals, with varieties and their properties     |
| [data/directions.yml](data/directions.yml) | The eight compass directions and their properties                      |
| [data/elements.yml](data/elements.yml) | Earth, air, fire, and water and what they govern                            |
| [data/holidays.yml](data/holidays.yml) | Holidays and festivals and their properties                                 |
| [data/metals.yml](data/metals.yml)     | Metals and their properties                                                 |
| [data/moon.yml](data/moon.yml)         | Moon phases, each month's full moon, and the moon by month                  |
| [data/numbers.yml](data/numbers.yml)   | The numbers 1 through 13 and their properties                               |
| [data/planets.yml](data/planets.yml)   | The sun, moon, and planets and their properties                             |
| [data/seasons.yml](data/seasons.yml)   | The four seasons and their properties                                       |
| [data/weekdays.yml](data/weekdays.yml) | Days of the week, ruling planets, Norse deities, and properties             |
| [data/tarot.yml](data/tarot.yml)       | Major arcana cards and the four minor arcana suits, with their properties   |
| [data/times.yml](data/times.yml)       | Times of day (dawn, noon, dusk, midnight) and their properties              |
| [data/zodiac.yml](data/zodiac.yml)     | The twelve zodiac signs and their properties                                |
| [data/chakras.yml](data/chakras.yml)   | The seven chakras: color, location, meaning, and signs of blockage          |
| [data/colors.yml](data/colors.yml)     | Colors and their shades (dark blue, royal blue, ...) with their properties  |
| [data/bibliography.yml](data/bibliography.yml) | Every source, keyed by a short id that entries reference in `citation` |
| [load_db.py](scripts/load_db.py)               | Script that loads the YAML data into a local MongoDB database               |
| [data_files.py](scripts/data_files.py)         | Shared helper that reads single-file and one-file-per-entry collections     |

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
- Keep entries in alphabetical order within each file. Plants are one file per plant in `data/plants/`, so order is handled by the filenames.
- Multi-value fields are YAML lists (one `- item` per line). The exception is `parts used`, which is a comma-separated string.
- Omit fields you are unsure about rather than guessing. Partial entries are fine.
- Keep properties short (a word or short phrase).
- Do not use parentheses in properties. Write plain phrases instead (`inner calm`, not `calm (inner)`; `release attachments`, not `attachments (release)`).
- Quote values that contain special YAML characters such as `:` or `#`.

## Entry templates

### Plants (`data/plants/`)

Each plant gets its own file in `data/plants/`. The file holds a single entry whose key is the plant's name, and the filename is that name lowercased, with apostrophes and periods removed and every other run of non-letters replaced by a hyphen: `adder's tongue` goes in `adders-tongue.yml`, `st. john's wort` in `st-johns-wort.yml`, and `bergamot, orange` in `bergamot-orange.yml`. `python scripts/validate_intentions.py` reports any file that is misnamed or holds more than one entry.

`data/plants/aconite.yml`:

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

Medicinal (herbalism) information goes under `medicinal`, just before `citation`, so it stays separate from the magical `parts used` and `properties`:

```yaml
  medicinal:
    parts used: aerial parts, flowers, leaves
    key constituents:
      - volatile oil with linalool, camphor, sabinene, and azulene
      - flavonoids
    key actions:
      - antispasmodic
      - astringent
    uses:
      - wounds
      - colds and flu
    preparations:
      - infusion
      - poultice
```

- `parts used` is a comma-separated string, like the top-level one, but lists the parts used medicinally.
- `key constituents`, `key actions`, and `uses` are lists of short, lowercase phrases. They are free text and are not checked against `intentions.py`.
- `preparations` lists the forms the plant is prepared in (`infusion`, `tincture`, `poultice`, ...).
- Leave out any field the source does not cover, and leave out doses. Safety cautions still belong in `toxicity`.

Every item in `properties` must be an intention listed in [intentions.py](scripts/intentions.py). If the intention you need is missing, add it there (lowercase, no parentheses, alphabetical order) before using it on a plant. `python scripts/validate_intentions.py` reports any property that is not in the list.

### Crystals (`crystals.yml`)

```yaml
agate:
  properties:
    - avoid enmity
    - grounding
  varieties:
    black:
      properties:
        - peace
    snakeskin:
      properties:
        - animal magic
  citation:
    - kynes-correspondences
```

Colors and types of a stone go under its `varieties` (`agate` > `varieties` > `snakeskin`), each with its own `properties`, rather than in parentheses. Stones commonly known by their own name, such as `moss agate`, `blue lace agate`, or `rose quartz`, are their own entries. A qualifier belongs in the property itself (`avoid enmity`, not `agate (avoid)` with `enmity`).

Every property must be in [intentions.py](scripts/intentions.py).

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
    - kynes-correspondences
```

`citation` is a list of ids from `data/bibliography.yml`. Every property must be in [intentions.py](scripts/intentions.py). Days stay in week order, Sunday to Saturday.

Note that the existing key is spelled `norse diety`. Keep it as is until it is renamed across the whole file in a dedicated change.

### Colors (`colors.yml`)

```yaml
blue:
  properties:
    - communication
    - truth
  shades:
    dark:
      properties:
        - guidance
    royal:
      properties:
        - loyalty
  citation:
    - kynes-correspondences
```

Shades of a color go under that color's `shades`, not as separate entries (`blue` > `shades` > `royal`, not `royal blue`). Each shade has its own `properties`. A property listed on the color applies to the color in general, so do not repeat it on every shade. Distinctly named colors such as `crimson`, `lavender`, or `turquoise` are their own entries.

Like plant properties, every color and shade property must be in [intentions.py](scripts/intentions.py).

### Metals (`metals.yml`)

```yaml
iron:
  properties:
    - defense from psychic attack
    - grounding
  citation:
    - kynes-correspondences
```

Every property must be in [intentions.py](scripts/intentions.py).

### Moon (`moon.yml`)

```yaml
full:
  type: phase
  properties:
    - abundance
    - manifestation
  months:
    april:
      properties:
        - growth
  citation:
    - kynes-correspondences
april:
  type: month
  properties:
    - beginnings
    - fertility
  citation:
    - kynes-correspondences
```

`type` is `phase` (`new`, `waxing`, `full`, `waning`, or a seasonal variant such as `waxing summer`; the dark moon is `new`, so use `new` rather than `dark` here and in a plant's `moon phase`) or `month` (the moon in that month generally, or a range such as `april through october`). The full moon of a particular month goes under `full` > `months`, not in the month entry. Phases are in cycle order and months in calendar order. Every property must be in [intentions.py](scripts/intentions.py).

### Directions, numbers, holidays, planets, and seasons (`directions.yml`, `numbers.yml`, `holidays.yml`, `planets.yml`, `seasons.yml`)

```yaml
north:
  properties:
    - abundance
    - grounding
  citation:
    - kynes-correspondences
```

Directions are in compass order starting from north, numbers in numeric order, planets in order from the sun (sun, moon, mercury, venus, earth, mars, and so on out to pluto), and seasons from spring to winter. Holidays are alphabetical. A plant's `holidays` and `planet` should use the names in `holidays.yml` and `planets.yml`, in lowercase. Every property must be in [intentions.py](scripts/intentions.py).

### Tarot (`tarot.yml`)

```yaml
hermit:
  arcana: major
  properties:
    - introspection
    - unutilized knowledge
  citation:
    - kynes-correspondences
```

`arcana` is `major` for a card or `minor` for a suit (`cups`, `pentacles`, `swords`, `wands`). Card names leave out "the" (`tower`, not `the tower`). Every property must be in [intentions.py](scripts/intentions.py).

### Times of day (`times.yml`)

```yaml
dawn:
  properties:
    - beginnings
    - hope
  citation:
    - kynes-correspondences
```

Times stay in the order of the day: dawn, noon, dusk, midnight. Every property must be in [intentions.py](scripts/intentions.py).

### Zodiac signs (`zodiac.yml`)

```yaml
aries:
  properties:
    - courage
    - virility
  citation:
    - kynes-correspondences
```

Every property must be in [intentions.py](scripts/intentions.py).

### Chakras (`chakras.yml`)

```yaml
root:
  color: red
  location: base of the spine
  meaning:
    - grounding
  signs of blockage:
    - arthritis
  properties:
    - grounding
    - security
  citation:
    - healthline-chakras
    - kynes-correspondences
```

`meaning` and `signs of blockage` are free text. Every item in `properties` must be in [intentions.py](scripts/intentions.py). Chakras keep their body order (root to crown) rather than alphabetical order, and plants refer to them by these names (`third eye`, not `third-eye` or `brow`).

## Validating your changes

Install the dependencies in a virtual environment, then lint with [yamllint](https://yamllint.readthedocs.io/) (rules in [.yamllint](.yamllint)):

```sh
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
yamllint --strict -c .yamllint data
```

yamllint checks syntax, 2-space indentation, trailing spaces, a final newline, spacing after colons, and duplicate keys (which YAML parsers otherwise silently overwrite).

### Pre-commit

[pre-commit](https://pre-commit.com/) runs yamllint on `data/` and checks that the properties in every data file except `elements.yml` are in the intentions list automatically. A commit that fails is rejected until the file is fixed.

```sh
pre-commit install          # once, to run the checks on each commit
pre-commit run --all-files  # run them manually
```

## Loading into MongoDB

The YAML files can be loaded into a local MongoDB database. You need a running MongoDB instance (for example `brew services start mongodb-community` on macOS) and the virtual environment from [Validating your changes](#validating-your-changes).

```sh
cp .env.example .env    # then edit .env if your setup differs
python scripts/load_db.py
```

Configuration lives in `.env` (git-ignored; never commit it):

| Variable      | Default                       | Description                                                                         |
| ------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string. Include credentials here if your instance requires auth. |
| `MONGO_DB`  | `book_of_shadows`           | Database to load into                                                               |

Command-line flags override `.env`, and real environment variables take precedence over `.env` values.

Each file or folder in `data/` becomes a collection (`plants/` -> `plants`, `bibliography.yml` -> `bibliography`). Each top-level entry becomes a document whose `_id` and `name` are the entry name, so a `citation` id such as `cunningham-herbs` matches the `_id` of a document in `bibliography`. The script is safe to re-run: documents are upserted. Options:

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
