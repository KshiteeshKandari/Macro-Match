# Macro Match

A static, no-build browser game that teaches nutrition facts for everyday
foods and global dishes. Two modes: **More / Less** (pick the food with the
higher value in a nutrient, streak-based) and **Guess the Value** (type a
number, scored on accuracy). Full design rationale lives in
[DESIGN.md](DESIGN.md); day-to-day instructions live in [README.md](README.md).
This file is quick orientation for working in the codebase.

## Stack & constraints

- **No build step, no Node, no Python.** Plain ES modules, vanilla JS, no
  framework, no bundler. Keep it that way unless the user explicitly asks to
  add tooling.
- ES modules can't load from `file://`, so the game must be served. Launch it
  with `powershell -ExecutionPolicy Bypass -File serve.ps1` (default port
  8080), or via the `macro-match` config in `.claude/launch.json` /
  `preview_start`.
- Tests run in-browser, not via a test runner: open `http://localhost:8080/tests/`
  and read the tab title (`PASS (N)` / `FAIL (N)`). There is no `npm test`.
- **Formatting:** JS/CSS/HTML/Markdown are formatted with Prettier:

  ```sh
  npx --yes prettier@3 --write "index.html" "tests/index.html" "css/styles.css" \
    "js/**/*.js" "README.md" "DESIGN.md" "CLAUDE.md"
  ```

  `data/*.json` is deliberately excluded — see Data rules below. There's no
  Python in this repo, so Black has nothing to format; don't add a Python
  toolchain just to have something for it to do.

## Structure

```
index.html          # shell + static help-dialog copy
css/styles.css       # single stylesheet, minimalist glass-panel look
js/
  main.js            # bootstrap: load data, wire header/help, route to home
  state.js            # in-memory state + localStorage (key: macroMatch.v1)
  data.js              # loads/validates data/*.json, GROUPS, CUISINES, NUTRIENTS
  stats.js             # lifetime per-nutrient miss tracking ("trouble spots")
  modes/
    higherLower.js     # pair selection + scoring for the More/Less mode
    guessValue.js       # round building + scoring for Guess the Value
  ui/
    screens.js          # screen components: home, mode select, game, results
    components.js        # food card, fact card, HUD, tile helpers, h()/mount()
    companion.js          # in-game pixel-art companion (reacts to round results)
    streetScene.js         # home-screen runner animation (hides when "How to
                            #   play" is open)
  util/
    format.js             # number/unit formatting
    rng.js                 # seedable PRNG (mulberry32) — for a future daily mode
data/
  foods.json            # everyday foods (no `cuisine` field)
  dishes.json, dishes-2.json  # cultural dishes (have `cuisine`, optional `swaps`)
  ingredient-swaps.json   # per-dish ingredient substitution tips, keyed by dish id + nutrient
assets/
  home-logo-sprite.webp  # animated avocado/pizza/banana logo above the title
  companion-sprite.webp   # 8x2 sprite sheet — see js/ui/companion.js header comment
  runner-sprite.webp       # 6x2 run-cycle sheet — see js/ui/streetScene.js
tests/
  index.html, tests.js    # browser-run unit tests + schema validation
```

Every sprite sheet's grid layout (columns/rows, what each frame is, native
cell size) is documented in the header comment of the module that renders
it — `js/ui/companion.js` and `js/ui/streetScene.js` — rather than here, so
it can't drift out of sync with the code.

## Data rules (when adding or editing foods/dishes)

- Schema is documented in DESIGN.md section 6. Required fields: `id`, `name`,
  `emoji`, `serving.label`, `serving.grams`, `nutrients.*` (all ten, >= 0),
  `difficulty` (1-3), `tags`, `source`.
- `image` is `null` by default; the UI falls back to `emoji` when absent (see
  `js/ui/components.js`). Set `image` to a relative path once an icon exists
  for that food — no other code change needed.
- A new data file must be registered in **both** `DATA_URLS` (`js/data.js`)
  and `URLS` (`tests/tests.js`), or it silently won't load/validate.
- Any dish at or above fat 20g, carbs 60g, sodium 800mg, or sugar 25g needs a
  matching `swaps` entry, and each swap needs ingredient pairs in
  `data/ingredient-swaps.json`. The tests catch a missing one.
- `source` should be the real provenance string, e.g. `"USDA FoodData Central"`
  for USDA-sourced values (CC0, public domain — cite per the README's Data
  sources section), or an honest approximation label (`"Approx. typical recipe"`,
  `"Label (approx.)"`, etc.) when it isn't an authoritative figure.
- **Always reload `/tests/` after a data change** and confirm `PASS`. The
  validator is the only thing that catches a bad schema, a missing swap, or an
  untrusted "learn more" link host before it ships.
- **Don't run Prettier over `data/*.json`.** They're hand-maintained as one
  compact object per line (one food/dish per line), which is what makes them
  readable and diffable; a full pretty-print would expand each entry across
  ~15 lines and make the dataset much harder to scan or review in a diff.

## Sprite assets

- Sprite sheets are frequently AI-generated and arrive with non-integer cell
  dimensions (e.g. a 6-column sheet that's 2000px wide, 333.3px per column).
  **Normalize to a clean integer grid before wiring up CSS** — resize with
  Pillow (`Image.resize(..., Image.LANCZOS)`) to the nearest clean multiple,
  a sub-1% stretch is imperceptible and prevents sub-pixel rounding drift
  between frames.
- Before trusting a multi-frame sheet, scan it for cross-frame bleed: compute
  a per-row, per-column "ink profile" (alpha > threshold) and confirm each
  column is its own isolated blob with a real gap on both sides. A pose that's
  wider than its own column (e.g. arms spread wide) can bleed into a neighbor
  and show up as a stray limb in the adjacent frame — fix by erasing the
  overflow to transparent in the source image, not by shrinking the CSS
  window (that just clips real content instead).
- All sprite `<img>`/background-image elements use `image-rendering: pixelated`
  to keep pixel art crisp when scaled.
- Unused sprite assets (an earlier iteration superseded by a newer one) get
  deleted, not left in `assets/` — check for zero references with a grep
  across `js/**/*.js` and `css/styles.css` before removing.

## UI conventions

- No icons on the mode-select cards or the cuisine chips — mode names
  (`More / Less`, `Guess the Value`) and cuisine names are plain text labels.
  Don't reintroduce emoji there without being asked.
- The home-screen logo (`.logo` / `.logo-icon` — an animated avocado, pizza,
  banana sprite loop) and per-food `emoji` fallbacks are a separate,
  intentional use of imagery — unaffected by the above.
- `GAME_NAME` in `js/ui/screens.js` is the single source of truth for the
  displayed game name; it already reads `"Macro Match"`.
- The home screen's best-score row (`.bests`) is a 3-column equal-width grid,
  not a loose flex row — equal-width columns keep it visually centered
  regardless of how long each label is. Order is Best Duel Score, Best
  Streak, Best Guess Score.
- `.howto` (the "How to play" details/summary) is center-aligned, matching
  the rest of the home screen's `.screen.center`.

## Known naming quirks (intentional, don't "fix" without asking)

- The **More / Less** mode is implemented in `js/modes/higherLower.js`, with
  internal names `hlPoints`, `hlMultiplier`, `bestHlScore`, and the mode id
  `'hl'` — these were kept as-is when the mode was renamed from "Higher /
  Lower" in the UI, to avoid an unnecessary refactor. Only the player-facing
  label changed.
- The home screen's "best duel score" label is a holdover from this project's
  original name ("Nutrition Duel", renamed to "Macro Match"). Left as-is
  unless asked to change it.

## What not to commit

- `.claude/` (local Claude Code config — `.gitignore`d), editor folders
  (`.vscode/`, `.idea/`), OS cruft (`.DS_Store`, `Thumbs.db`), and
  `node_modules/` if formatting tooling ever gets installed locally instead of
  run via `npx`. None of this ships with the hosted game.
- Debug/scratch files created while iterating (test screenshots, cropped
  sprite-sheet verification images, one-off scripts) — these belong in the
  session scratchpad, never the repo, and should be deleted once their
  purpose (verifying a fix) is served.
- A superseded asset once nothing references it (see Sprite assets above).

## Git

- Follow the user's global commit conventions (conventional commits, no AI
  attribution lines in commit messages or PR descriptions) from
  `~/.claude/CLAUDE.md`. This repo's own preference reinforces the same rule:
  **no AI co-author / attribution of any kind** in commits or pushes for this
  project, full stop.
- Only commit when explicitly asked, and only files related to the actual
  working app (see "What not to commit" above).
