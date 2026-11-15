# Design Doc: Macro Match (working title)

Status: Draft v1 · Scope: hackathon MVP with a path to scale
Title alternatives: Plate Check, Bite Size, Guess the Plate, Macro Match

---

## 1. Overview

A fast, browser-based, "less games"-style game that teaches the general public the nutritional values of everyday foods. One simple mechanic per mode, a short loop, a streak or score to beat, and a one-line fun fact after every answer so players learn without feeling taught.

**Pitch:** "You think you know what's in your food? Prove it in 60 seconds."

### Goals

- Make nutrition knowledge feel like a game, not a lecture.
- Ship a playable, polished MVP in a hackathon timeframe (hours to about one day).
- Keep the architecture simple (static, no backend) but structured so it can grow.

### Non-goals (v1)

- Accounts, backend, global leaderboards.
- Medical or dietary advice. This is educational trivia.
- Real food photography (emoji for now).
- Rank/sort mode and daily puzzle (planned, see Roadmap).

---

## 2. Target Audience

General public: adults and teens curious about food. Common, recognizable foods and plain language. No assumed nutrition knowledge.

---

## 3. Core Design Principles

1. **One screen, one decision.** Every round is understandable in under 3 seconds.
2. **Every answer teaches.** Right or wrong, the reveal shows real numbers plus a fun fact.
3. **Fair comparisons.** Typical serving sizes, always shown on screen.
4. **Surprise is the hook.** Curate foods so that a meaningful share of answers defy intuition.
5. **Mobile first.** Most casual play happens on phones.

---

## 4. Game Modes (v1)

### 4.1 More / Less (Streak mode)

**Loop**

1. Show two food tiles (emoji, name, serving size). **Both values are hidden.**
2. The prompt asks "Which has more {nutrient}?" and the player **clicks the tile** they think is higher (there are no answer buttons). Hovering a tile lifts it and gives it a dark outline; tiles are also keyboard-focusable (Tab, then Enter or Space).
3. The picked tile locks, then both values count up. The true higher tile turns green, and a wrong pick turns red.
4. A fun-fact card appears (one line). The player taps Continue (or it auto-advances after about 2.5s).
5. Correct: streak +1 and a fresh pair of foods appears (left/right order is random). Wrong: game over.

**End screen:** final streak, personal best, "What you learned" recap (the 3 biggest surprises from the run), Play Again, Switch Mode.

**Adaptive difficulty (gap-based)**

- Define the relative gap between two foods: `gap = |a - b| / max(a, b)`.
- The pair selector picks pairs whose gap falls in a band that narrows with the streak:

| Streak | Gap band | Feel     |
| ------ | -------- | -------- |
| 0-3    | > 60%    | Obvious  |
| 4-8    | 30-60%   | Moderate |
| 9-14   | 15-30%   | Tricky   |
| 15+    | 5-15%    | Expert   |

- Never pair foods with an identical value, and never repeat a food within the last 10 rounds.
- Nutrient is chosen per round (random from enabled set) or fixed by the player's selection. Default: random per round with the nutrient shown clearly.

### 4.2 Guess the Value (Score mode)

**Loop**

1. Show one food (emoji, name, typical serving) and a nutrient ("How many calories?").
2. Player types a number into a numeric input and submits.
3. Reveal the true value, the player's guess, and the points earned.
4. Fun-fact card, then the next round.
5. 5 rounds per game. Total score is the sum.

**Scoring (curved, with bonuses and a hot streak)**

```
pctError = |guess - truth| / max(truth, nutrient.scale)
base     = round(1000 * (1 - min(1, pctError))^2)
bonus    = Perfect (exact) +500 | Bullseye (<=5%) +250 | Close (<=15%) +100
points   = round((base + bonus) * hotStreakMultiplier)
```

- The squared curve makes accuracy pay: 10% off = 810, 20% = 640, 50% = 250, 100% = 0.
- **Hot streak:** a round within 20% is "good". One good round in a row before this one gives x1.25, two or more x1.5. A bad round resets it.
- Best possible game is 10,125 (all exact: 1500 + 1875 + 3 x 2250).
- A round more than 50% off counts as a miss for the trouble-spot stats (`MISS_ERROR`).
- Edge cases: if `truth` is 0 (e.g. sugar in chicken breast), error is measured against a per-nutrient small `scale` instead of a percentage. Documented in code.
- The reveal shows the breakdown ("810 accuracy + 100 close bonus x 1.25 hot streak") and the guess vs. truth on a small horizontal bar.

**More / Less scoring:** a correct pick earns `round((100 + 100 * (1 - gap)) * (1 + 0.1 * min(streak, 10)))`, so close calls pay up to 2x and a long streak up to x2 (max 400 per pick). The game still ends on the first miss. Best streak and best duel score are tracked separately.

**Input UX:** `inputmode="decimal"` so phones show a numeric keypad. Enter key submits. Units are displayed next to the field (kcal, g, mg). Rejects empty and negative values.

**End screen:** total score out of 10,125, per-round breakdown, best score, Play Again.

---

### 4.3 Cuisine filter and cooking swaps (implemented)

**Cuisine filter.** The mode screen has a Cuisines section (multi-select, at least one on, remembered in `localStorage`). Pools are the union of the selected cuisines: "Everyday foods" (`data/foods.json`) plus Indian, Mexican, Italian, Chinese, Japanese and Middle Eastern (`data/dishes.json`) and Korean, Thai, Vietnamese, Ethiopian and Greek (`data/dishes-2.json`), 10-13 dishes each. Dishes are complete prepared dishes (butter chicken, carbonara, ramen), not ingredients, with a typical restaurant or home serving. A dish card shows a small cuisine tag. Both modes draw from the selected pool.

**Cooking swaps.** After an answer is revealed, any revealed dish that is "high" in a nutrient gets a small square **i** button on its card, plus a one-line hint under the fun fact. Clicking it opens a panel of culture-appropriate ways to cook the dish lighter, one tip per flagged nutrient. Each tip also lists **ingredient swaps** as "from → to" rows (for example, heavy cream → blended soaked cashews). Those pairs live in `data/ingredient-swaps.json`, keyed by dish id and then nutrient (`{"in-butter-chicken": {"fat": [["heavy cream", "blended soaked cashews"]]}}`), and are merged onto the matching swap entry at load time. A test fails if a tip has no ingredient pair or if the file has an id or nutrient with no matching tip. The icon only appears after the reveal so it can't leak the answer.

| Flag        | Threshold (per serving) |
| ----------- | ----------------------- |
| High fat    | 20 g or more            |
| High carbs  | 60 g or more            |
| High sodium | 800 mg or more          |
| High sugar  | 25 g or more            |

Thresholds live in `HIGH` in `js/data.js`. Each dish in `data/dishes.json` carries `cuisine` and `swaps: [{ "nutrient": "fat", "tip": "..." }]`. A tip is only shown if the dish is actually high in that nutrient, and a test fails if a high nutrient has no tip.

**Authoring guidelines for swaps:** keep the dish's character (bake the samosa, don't turn it into a salad), name a concrete technique or ingredient from the same cuisine, one or two sentences, and no health claims.

### 4.4 Results page extras (implemented)

- **Foods in this run:** a list of every food shown (each once), with its cuisine, serving, the nutrient value(s) it was asked about (plus your guess and points in Guess the Value) and "High fat / carbs / sodium / sugar" tags. A **Make it healthier** button at the top opens the swap panel (tips and ingredient swaps) for every food that has one, and each row has its own toggle. Foods that aren't flagged show "Nothing flagged". Every food that is high in a nutrient has swaps, enforced by a test.
- **Your trouble spots:** every answered round is counted per nutrient in `localStorage` (lifetime, this browser only; nothing is sent anywhere). In More/Less a round is a miss when you pick the wrong tile. In Guess the Value it is a miss below 500 points. A nutrient needs 3+ rounds and at least one miss to qualify. The page shows the worst nutrient, a miss-rate bar for the top three, this run's misses, a one-line tip, and a link to an outside page (Harvard Nutrition Source, or NHS for calories) that opens in a new tab with `rel="noopener noreferrer"`. The links are static, so no player data is sent. They were checked to resolve when added; recheck occasionally.

## 5. Nutrients

| Key        | Label         | Unit |
| ---------- | ------------- | ---- |
| `calories` | Calories      | kcal |
| `protein`  | Protein       | g    |
| `carbs`    | Carbohydrates | g    |
| `fat`      | Fat           | g    |
| `sugar`    | Sugar         | g    |
| `sodium`   | Sodium        | mg   |
| `fiber`    | Fiber         | g    |
| `vitaminC` | Vitamin C     | mg   |
| `iron`     | Iron          | mg   |
| `calcium`  | Calcium       | mg   |

Players can toggle nutrient groups on the mode-select screen: **Basics** (calories), **Macros** (protein, carbs, fat), **Watch-outs** (sugar, sodium), **Micros** (fiber, vitamin C, iron, calcium). Default: Basics + Macros + Watch-outs. Micros are opt-in because they are harder.

---

## 6. Data Model

A single static file `data/foods.json`, loaded at startup. Values are per **typical serving**.

```json
{
  "id": "banana-medium",
  "name": "Banana",
  "emoji": "🍌",
  "image": null,
  "serving": { "label": "1 medium (118 g)", "grams": 118 },
  "nutrients": {
    "calories": 105,
    "protein": 1.3,
    "carbs": 27,
    "fat": 0.4,
    "sugar": 14,
    "sodium": 1,
    "fiber": 3.1,
    "vitaminC": 10,
    "iron": 0.3,
    "calcium": 6
  },
  "facts": {
    "sugar": "A medium banana has about as much sugar as 3 teaspoons.",
    "calories": "Bananas are energy-dense for a fruit but still modest at 105 kcal."
  },
  "genericFact": "Bananas are botanically berries, but strawberries are not.",
  "difficulty": 1,
  "tags": ["fruit"],
  "source": "USDA FoodData Central"
}
```

**Notes**

- `image` is null for v1; the UI renders `emoji`. When an image library lands, the renderer prefers `image` and falls back to `emoji`. No game logic changes.
- `facts` is optional and keyed by nutrient. Fallback order for the reveal card: nutrient-specific fact, then `genericFact`, then a computed comparison (e.g. "That's 2.3x the {nutrient} of {other food}").
- `difficulty` (1-3) = how recognizable or predictable the food is. Used to keep early rounds familiar.
- `source` is kept for accuracy and attribution.
- Seed size: about 100-150 foods covering fruit, vegetables, grains, proteins, dairy, snacks, fast food, drinks, desserts, and a few sneaky ones (granola, smoothies, salad dressing, flavored yogurt).

**Data curation guidelines**

- Source values from USDA FoodData Central or nutrition labels; record the source. Round sensibly (calories to whole numbers, grams to 1 decimal).
- Prioritize foods that are recognizable, have an emoji, and have a well-defined serving.
- Include deliberate "surprise pairs" (e.g. a salad with dressing vs. a burger on sodium, juice vs. soda on sugar).
- Run a validation script (see section 12) before every release.

---

## 7. Screens & Flow

```
Home --> Mode Select --> [More/Less | Guess the Value] --> Game --> Results
  ^                                                                     |
  +---------------------------------------------------------------------+
```

1. **Home:** Title, Play button, best scores (from localStorage), short "How to play".
2. **Mode Select:** Two big cards (More/Less, Guess the Value). Nutrient group toggles.
3. **Game screen:** Layout depends on mode (see wireframes below).
4. **Reveal state:** Inline on the game screen, not a separate page. Shows values, result (correct/wrong, points), and fun-fact card.
5. **Results:** Score/streak, personal best, "What you learned" recap, Play Again, Switch Mode, Share (copy text).

### Wireframes (text)

**More / Less**

```
 Streak: 4                 Best: 9
 -------------------------------------
         Which has MORE sugar?
     Click the one you think is higher
  [ 🍌 Banana ]   vs   [ 🥑 Avocado ]
  1 medium            1/2 fruit
  ? g sugar           ? g sugar
```

Clicking a tile is the answer. A "same" option is not offered, because ties are excluded.

**Guess the Value**

```
 Round 2/5                Score: 1640
 -------------------------------------
            🍕
     1 slice cheese pizza (107 g)
     How many CALORIES?
     [ _______ ] kcal
     [   Lock it in   ]
```

---

## 7b. Visual Style (implemented)

Minimalist, light grey and white. Soft grey gradient background; translucent white glass panels (`backdrop-filter` blur) with hairline borders; **square corners everywhere** (buttons, cards, inputs, bars, checkboxes); primary buttons are solid near-black, secondary are hairline outlines; small uppercase letter-spaced labels. Font is Inter (loaded from Google Fonts, with a Helvetica/Arial fallback). No dark mode. Correct and wrong states use muted green and red outlines plus text, never color alone.

## 8. Feedback, Juice & Feel

- Correct: green flash, short pop sound (muted by default with a toggle), streak counter bumps.
- Wrong: shake and red flash; reveal both values before game over.
- Number reveal: count-up animation on values (about 600 ms).
- Respect `prefers-reduced-motion`.
- Sound is optional and off by default for the hackathon; add if time permits.

---

## 9. Educational Layer

- **Per-round fun fact:** one line, under about 120 characters, concrete, no moralizing. Examples: "A glass of orange juice has about as much sugar as a can of cola." / "Two tablespoons of ranch have more sodium than a bag of chips."
- **Computed comparisons** as fallback ("That's like 4 bananas of sugar").
- **End recap:** track the "surprise score" per round (the most counterintuitive correct and wrong answers, based on the gap between common intuition and truth, hand-tagged via `surprise` weight or approximated by difficulty). Show the top 3.
- **Tone:** curious and neutral. No shaming, no good/bad food labels. Add a footer disclaimer: "Values are approximate and for entertainment and education, not medical advice."

---

## 10. Technical Design

### Stack

- Vanilla HTML, CSS, and JavaScript (ES modules). No build step. Deployable on any static host (GitHub Pages, Netlify, or just open the file via a local server).
- Structured so it can move to a framework later: logic is separated from rendering.

### Proposed file structure

```
Macro-Match/
  index.html
  README.md
  DESIGN.md
  CLAUDE.md
  css/
    styles.css
  js/
    main.js              # bootstrap, screen routing
    state.js             # game state + localStorage
    data.js              # load/validate data/*.json, selectors
    stats.js             # lifetime per-nutrient miss tracking
    modes/
      higherLower.js     # pair selection, streak logic (More/Less)
      guessValue.js       # scoring, round logic (Guess the Value)
    ui/
      screens.js          # render home/select/game/results
      components.js        # food card, fact card, input, h()/mount() helpers
      companion.js          # in-game pixel-art companion (reacts to results)
      streetScene.js         # home-screen runner animation
    util/
      format.js             # units, rounding
      rng.js                 # seedable RNG (supports a daily mode later)
  data/
    foods.json             # everyday foods
    dishes.json, dishes-2.json  # cultural dishes (cuisine + optional swaps)
    ingredient-swaps.json   # per-dish ingredient substitution tips
  assets/
    *.webp                 # sprite sheets (home logo, companion, runner)
  tests/
    index.html, tests.js   # browser-run unit tests + data validation
  serve.ps1               # tiny local static server (PowerShell; no Node/Python needed)
```

Implementation note: Node and Python are not installed on the dev machine, so the validator and unit tests run in the browser at `/tests/` instead of as Node scripts. ES modules cannot load over `file://`, so the game must be served (see README).

### Key modules

- `data.js`: `loadFoods()`, `getFoodsForNutrient(n)`, validation of required fields.
- `higherLower.js`: `pickPair(streak, nutrient, history)` implementing the gap bands, with a fallback that widens the band if no candidates exist.
- `guessValue.js`: `score(guess, truth, nutrient)` per section 4.2.
- `state.js`: in-memory game state; best scores persisted in `localStorage` under a namespaced key (`macroMatch.v1`), wrapped in try/catch.
- `rng.js`: small seeded PRNG (mulberry32) so a daily mode can reuse the same selectors.

### Rendering

- Single-page; screens are `<section>` elements toggled by a tiny router.
- Plain DOM updates; no framework. Components return DOM nodes.
- Emoji rendered via text. An `<img>` swap is behind the `image` field.

### Accessibility

- Buttons are real `<button>` elements with visible focus styles.
- Color is never the only signal (icons and text for correct/wrong).
- Live region (`aria-live="polite"`) announces results and facts.
- Minimum 44px tap targets; text contrast at WCAG AA.

### Performance

- One small JSON (about 50-100 KB). No network calls after load.
- Target: interactive in under 1 second on mobile broadband.

---

## 11. Persistence & Sharing

- `localStorage`: best streak (More/Less), best score (Guess the Value), nutrient toggles, sound setting.
- **Share:** copy-to-clipboard text result, e.g.
  `Macro Match - More/Less streak: 12 🔥 Can you beat it?` plus URL. (Emoji-grid shares come with the daily mode.)

---

## 12. Testing & Quality

- `tests/` (open `http://localhost:8080/tests/`): checks every food has required fields, numeric nutrients (non-negative), unique ids, an emoji, a serving label, and flags implausible values (e.g. calories inconsistent with 4/4/9 macro estimate by more than about 25%).
- Unit tests (Node's built-in test runner or plain asserts) for: `score()` edge cases (truth = 0, huge guess, exact guess), `pickPair()` never returning ties or recent repeats, and the gap-band fallback.
- Manual QA matrix: Chrome and Safari on iOS, Android Chrome, desktop; keyboard-only play; reduced motion.

---

## 13. Milestones (Hackathon Plan)

| Phase | Deliverable                                            |
| ----- | ------------------------------------------------------ |
| 1     | Data: 100+ foods in `foods.json` plus validator        |
| 2     | More/Less playable end to end (no polish)              |
| 3     | Guess the Value playable end to end                    |
| 4     | Fun facts, results screen, recap, localStorage         |
| 5     | Polish: animations, mobile layout, accessibility, copy |
| 6     | Deploy to a static host, record demo                   |

Suggested cut line if time is short: More/Less with calories, protein, sugar and 60 foods is the minimum demoable product.

---

## 14. Roadmap (post-hackathon)

1. **Rank / Sort mode:** drag 4-5 foods into order by a nutrient.
2. **Daily challenge:** seeded puzzle, one per day, emoji-grid share.
3. **Image asset library:** swap emoji for illustrations or photos via the `image` field.
4. **Backend:** global leaderboards, accounts, streaks across days.
5. **More content:** regional cuisines, restaurant items, packaged brands, serving-size toggle (per 100 g).
6. **Framework migration:** port to React/Vite or similar if UI complexity grows; logic modules stay unchanged.
7. **Localization** and unit options (kcal/kJ, metric/imperial).

---

## 15. Risks & Mitigations

| Risk                                    | Mitigation                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| Data inaccuracies undermine credibility | Cite USDA, validate script, spot-check surprising items, show approximate disclaimer |
| "Typical serving" is subjective         | Always show the serving label and grams on the card                                  |
| Typing numbers is awkward on phones     | Numeric keypad via `inputmode`, forgiving percentage scoring                         |
| Repetition with a small dataset         | 100+ foods, history avoidance, multiple nutrients per food multiply pairings         |
| Preachy tone turns users off            | Neutral, curiosity-driven copy; no "good/bad food" framing                           |
| Emoji coverage limits food variety      | Pick foods with emoji for v1; image field ready for later                            |

---

## 16. Open Questions

1. ~~More/Less layout~~ Decided: both values hidden, click the higher tile.
2. Should the nutrient be random each round or chosen once per run?
3. Final title (see alternatives at the top).
4. Is sound in scope for the hackathon demo?
5. Should Guess the Value offer a "hint" (e.g. a reference food) at a point cost?
