# Macro Match

A quick browser game that teaches nutrition facts for everyday foods. See [DESIGN.md](DESIGN.md) for the full design.

**Modes:** More / Less (streak plus score) and Guess the Value (5 rounds, curved accuracy scoring with bonuses and a hot-streak multiplier; max 10,125). Scoring constants live in `js/modes/guessValue.js` and `js/modes/higherLower.js`.

## Run it

ES modules can't load from `file://`, so serve the folder. No Node or Python needed:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open <http://localhost:8080/>. Tests and data validation: <http://localhost:8080/tests/> (the tab title shows PASS or FAIL).

## Add or edit foods

- `data/foods.json`: everyday foods. `data/dishes.json` and `data/dishes-2.json`: cultural dishes (have a `cuisine` and optional `swaps`). A new data file must be added to `DATA_URLS` in `js/data.js` and to `URLS` in `tests/tests.js`.
- Values are per typical serving; see the schema in DESIGN.md section 6.
- A dish that is high in fat (20 g+), carbs (60 g+), sodium (800 mg+) or sugar (25 g+) needs a matching entry in `swaps`, and each swap needs ingredient pairs in `data/ingredient-swaps.json` (`"dish-id": { "fat": [["from", "to"]] }`). The tests will tell you if one is missing.
- Each nutrient's "learn more" tip and outside link live in `NUTRIENTS[...].learn` in `js/data.js`. The test only allows links on the trusted hosts listed in `tests/tests.js`.
- To add a cuisine, add it to `CUISINES` in `js/data.js` and give it 10+ dishes.
- Reload `/tests/` after any data change to validate. To use images later, set a food's `image` path; the emoji remains the fallback.

## Data sources

Nutrient values marked `"source": "USDA FoodData Central"` come from the USDA's public-domain nutrition database. Other entries are labeled with their approximation basis (restaurant estimate, nutrition label, typical recipe, etc.) in their `source` field.

> U.S. Department of Agriculture, Agricultural Research Service, Beltsville Human Nutrition Research Center. FoodData Central. [Internet]. [cited 2026-11-15]. Available from <https://fdc.nal.usda.gov/>.

FoodData Central data is released under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) (public domain); this citation is given per USDA's request, not because it's legally required.
