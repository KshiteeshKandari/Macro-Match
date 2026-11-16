// Screens and per-mode game controllers.
import {
  CUISINES,
  GROUPS,
  HIGH,
  NUTRIENTS,
  cuisineLabel,
  cuisineOf,
  factFor,
  flagsFor,
  swapsFor,
} from "../data.js";
import {
  MIN_ASKED,
  MISS_ERROR,
  countBy,
  totalAsked,
  weakest,
} from "../stats.js";
import { makeRng } from "../util/rng.js";
import { dailySeed } from "../util/daily.js";
import { countUp, formatNumber, formatValue } from "../util/format.js";
import {
  gapOf,
  hlMultiplier,
  hlPoints,
  pickNutrient,
  pickPair,
} from "../modes/higherLower.js";
import {
  ROUNDS,
  buildRounds,
  maxTotal,
  parseGuess,
  roundScore,
} from "../modes/guessValue.js";
import {
  factCard,
  foodCard,
  h,
  hud,
  makeTile,
  mount,
  setHud,
  swapPanel,
  wireSwaps,
} from "./components.js";
import { companionState, makeCompanion, reactCompanion } from "./companion.js";
import { makeStreetScene } from "./streetScene.js";

const GAME_NAME = "Macro Match";

/* ------------------------------------------------------------------ Home */

export function showHome(ctx) {
  const s = ctx.store.get();
  const howto = h(
    "details",
    { class: "howto" },
    h("summary", {}, "How to play"),
    h(
      "p",
      {},
      h("strong", {}, "More / Less: "),
      "Two foods, numbers hidden. Click the one you think has more. One miss and it's over. Close calls and long streaks score more.",
    ),
    h(
      "p",
      {},
      h("strong", {}, "Guess the Value: "),
      `Type your best guess for ${ROUNDS} foods. Accuracy pays: points curve steeply, with bonuses for close guesses and a hot-streak multiplier for back-to-back good ones.`,
    ),
    h("p", {}, "All numbers are for a typical serving, shown on every card."),
  );
  const scene = makeStreetScene();
  howto.addEventListener("toggle", () => {
    if (howto.open) {
      scene.stop();
      scene.el.style.display = "none";
    } else {
      scene.el.style.display = "";
      scene.start();
    }
  });
  scene.start();

  mount(
    h(
      "section",
      { class: "screen center" },
      h(
        "div",
        { class: "logo", "aria-hidden": "true" },
        h("span", { class: "logo-icon avocado" }),
        h("span", { class: "logo-icon pizza" }),
        h("span", { class: "logo-icon banana" }),
      ),
      h("h1", { tabindex: "-1", "data-focus": true }, GAME_NAME),
      h(
        "p",
        { class: "tagline" },
        "You think you know what's in your food? Prove it.",
      ),
      h(
        "button",
        {
          class: "btn btn-primary big",
          onclick: () => {
            scene.stop();
            showSelect(ctx);
          },
        },
        "Play",
      ),
      h(
        "div",
        { class: "bests" },
        h(
          "div",
          {},
          h("strong", {}, s.bestHlScore.toLocaleString("en-US")),
          h("span", {}, "best duel score"),
        ),
        h(
          "div",
          {},
          h("strong", {}, s.bestStreak),
          h("span", {}, "best streak"),
        ),
        h(
          "div",
          {},
          h("strong", {}, s.bestScore.toLocaleString("en-US")),
          h("span", {}, "best guess score"),
        ),
      ),
      howto,
      scene.el,
    ),
  );
}

/* ----------------------------------------------------------- Mode select */

export function showSelect(ctx) {
  const selected = new Set(ctx.store.get().groups);
  const note = h("p", { class: "form-note", role: "status" }, "");

  const chips = GROUPS.map((g) => {
    const input = h("input", {
      type: "checkbox",
      checked: selected.has(g.id),
      onchange: (e) => {
        if (!e.target.checked && selected.size === 1) {
          e.target.checked = true;
          note.textContent = "Keep at least one nutrient group on.";
          return;
        }
        note.textContent = "";
        if (e.target.checked) selected.add(g.id);
        else selected.delete(g.id);
        ctx.store.setGroups([...selected]);
      },
    });
    return h(
      "label",
      { class: "chip" },
      input,
      h("span", {}, h("strong", {}, g.label), h("small", {}, g.hint)),
    );
  });

  const cuisinesOn = new Set(ctx.store.get().cuisines);
  const cuisineChips = CUISINES.map((c) => {
    const count = ctx.foods.filter((f) => cuisineOf(f) === c.id).length;
    const input = h("input", {
      type: "checkbox",
      checked: cuisinesOn.has(c.id),
      onchange: (e) => {
        if (!e.target.checked && cuisinesOn.size === 1) {
          e.target.checked = true;
          note.textContent = "Keep at least one cuisine on.";
          return;
        }
        note.textContent = "";
        if (e.target.checked) cuisinesOn.add(c.id);
        else cuisinesOn.delete(c.id);
        ctx.store.setCuisines([...cuisinesOn]);
      },
    });
    return h(
      "label",
      { class: "chip" },
      input,
      h(
        "span",
        {},
        h("strong", {}, c.label),
        h("small", {}, `${count} ${c.id === "everyday" ? "foods" : "dishes"}`),
      ),
    );
  });

  const bulkBtn = (label, onclick) =>
    h("button", { class: "link-btn", type: "button", onclick }, label);

  const nutrientHead = h(
    "div",
    { class: "section-head" },
    h("h2", { class: "section-title" }, "Nutrients to include"),
    h(
      "div",
      { class: "bulk-actions" },
      bulkBtn("Select all", () => {
        ctx.store.setGroups(GROUPS.map((g) => g.id));
        showSelect(ctx);
      }),
      bulkBtn("Deselect all", () => {
        ctx.store.setGroups([GROUPS[0].id]);
        showSelect(ctx);
      }),
    ),
  );

  const cuisineHead = h(
    "div",
    { class: "section-head" },
    h("h2", { class: "section-title" }, "Cuisines"),
    h(
      "div",
      { class: "bulk-actions" },
      bulkBtn("Select all", () => {
        ctx.store.setCuisines(CUISINES.map((c) => c.id));
        showSelect(ctx);
      }),
      bulkBtn("Deselect all", () => {
        ctx.store.setCuisines([CUISINES[0].id]);
        showSelect(ctx);
      }),
    ),
  );

  mount(
    h(
      "section",
      { class: "screen" },
      h("h1", { tabindex: "-1", "data-focus": true }, "Choose a mode"),
      h("h2", { class: "section-title" }, "Today's challenge"),
      h(
        "div",
        { class: "mode-grid" },
        dailyModeCard(
          ctx,
          "hl",
          "More / Less",
          "Same puzzle as everyone today — one attempt.",
        ),
        dailyModeCard(
          ctx,
          "guess",
          "Guess the Value",
          "Same 5 foods as everyone today — one attempt.",
        ),
      ),
      h("h2", { class: "section-title" }, "Freeplay"),
      h(
        "div",
        { class: "mode-grid" },
        modeCard(
          "More / Less",
          "Click the food with more. One wrong pick ends the run.",
          () => startMode(ctx, "hl"),
        ),
        modeCard(
          "Guess the Value",
          `${ROUNDS} foods, one number each. Closer guesses score more.`,
          () => startMode(ctx, "guess"),
        ),
      ),
      cuisineHead,
      h("div", { class: "chips" }, cuisineChips),
      nutrientHead,
      h("div", { class: "chips" }, chips),
      note,
    ),
  );
}

function modeCard(title, text, onclick) {
  return h(
    "button",
    { class: "mode-card", onclick },
    h("span", { class: "mode-title" }, title),
    h("span", { class: "mode-text" }, text),
  );
}

// A mode card that either starts today's daily (if not played yet) or shows
// today's locked-in result (if it's already been played).
function dailyModeCard(ctx, mode, title, text) {
  const rec = ctx.store.getDaily(mode);
  if (!rec) {
    return h(
      "button",
      {
        class: "mode-card",
        onclick: () => startMode(ctx, mode, { daily: true }),
      },
      h("span", { class: "mode-title" }, title),
      h("span", { class: "mode-text" }, text),
    );
  }
  const resultText =
    mode === "hl"
      ? `${rec.score.toLocaleString("en-US")} pts, streak ${rec.streak}`
      : `${rec.score.toLocaleString("en-US")} pts`;
  return h(
    "div",
    { class: "mode-card done" },
    h("span", { class: "mode-title" }, `✓ ${title}`),
    h(
      "span",
      { class: "mode-text" },
      `Done for today — ${resultText}. New one tomorrow.`,
    ),
  );
}

// Foods for the cuisines currently switched on (falls back to everything if the pool is tiny).
export function poolFor(ctx) {
  const on = new Set(ctx.store.get().cuisines);
  const pool = ctx.foods.filter((f) => on.has(cuisineOf(f)));
  return pool.length >= 10 ? pool : ctx.foods;
}

export function startMode(ctx, mode, opts = {}) {
  ctx.lastMode = mode;
  if (mode === "hl") playHigherLower(ctx, opts);
  else playGuess(ctx, opts);
}

/* ---------------------------------------------------------- More/Less */

export function playHigherLower(ctx, { daily = false } = {}) {
  const rng = makeRng(daily ? dailySeed("hl") : undefined);
  const nutrients = ctx.store.enabledNutrients();
  const prevBest = ctx.store.get().bestStreak;
  const run = {
    streak: 0,
    score: 0,
    log: [],
    history: [],
    sequence: [],
    misses: [],
  };
  const pool = poolFor(ctx);
  const companionEl = makeCompanion();
  let nutrient = null;

  function nextRound() {
    nutrient = pickNutrient(nutrients, nutrient, rng);
    const [left, right] = pickPair({
      foods: pool,
      nutrient,
      streak: run.streak,
      history: run.history,
      rng,
    });
    run.history.push(left.id, right.id);
    run.sequence.push(
      { food: left, nutrient, value: left.nutrients[nutrient] },
      { food: right, nutrient, value: right.nutrients[nutrient] },
    );
    draw(left, right);
  }

  // Both values start hidden; the player clicks the tile they think is higher.
  function draw(left, right) {
    const N = NUTRIENTS[nutrient];
    const vl = left.nutrients[nutrient];
    const vr = right.nutrients[nutrient];
    const higher = vl > vr ? left : right;
    const lower = higher === left ? right : left;
    const leftCard = foodCard(left, { nutrient });
    const rightCard = foodCard(right, { nutrient });
    const reveal = h("div", { class: "reveal", "aria-live": "polite" });
    const locks = [];
    let answered = false;

    function choose(picked) {
      if (answered) return;
      answered = true;
      locks.forEach((lock) => lock());
      const correct = picked === higher;

      for (const [card, food] of [
        [leftCard, left],
        [rightCard, right],
      ]) {
        countUp(card.querySelector(".num"), nutrient, food.nutrients[nutrient]);
        if (food === picked) card.classList.add("picked");
        if (food === higher) card.classList.add("correct");
        else if (food === picked) card.classList.add("wrong");
      }

      const fact = factFor(higher, nutrient);
      const gap = gapOf(vl, vr);
      const earned = correct ? hlPoints(gap, run.streak) : 0;
      const mult = hlMultiplier(run.streak);
      run.log.push({
        food: higher,
        other: lower,
        nutrient,
        correct,
        gap,
        fact,
        points: earned,
      });
      ctx.store.recordRound(nutrient, !correct);
      if (!correct) run.misses.push(nutrient);
      if (correct) {
        run.score += earned;
        run.streak += 1;
        setHud("streak", run.streak);
        setHud("score", run.score.toLocaleString("en-US"));
        if (ctx.store.submitBest("bestStreak", run.streak))
          setHud("best", run.streak);
      }

      const path = !correct
        ? "bad"
        : companionState(run.streak, 0, run.log.length);
      reactCompanion(companionEl, path);

      const next = h(
        "button",
        {
          class: "btn btn-primary",
          onclick: () =>
            correct
              ? nextRound()
              : showResults(ctx, hlSummary(ctx, run, prevBest, daily)),
        },
        correct ? "Next" : "See results",
      );
      reveal.replaceChildren(
        h(
          "p",
          { class: `verdict ${correct ? "good" : "bad"}` },
          correct
            ? `✓ Correct! +${earned.toLocaleString("en-US")} points${mult > 1 ? ` (×${mult.toFixed(1)} streak)` : ""}`
            : `✗ Not quite. ${higher.name} has more.`,
        ),
        h(
          "p",
          { class: "compare" },
          `${left.name}: ${formatValue(nutrient, vl)} · ${right.name}: ${formatValue(nutrient, vr)}`,
        ),
        factCard(fact),
        ...wireSwaps([
          { card: leftCard, food: left },
          { card: rightCard, food: right },
        ]),
        next,
      );
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    locks.push(
      makeTile(leftCard, `Pick ${left.name}, ${left.serving.label}`, () =>
        choose(left),
      ),
      makeTile(rightCard, `Pick ${right.name}, ${right.serving.label}`, () =>
        choose(right),
      ),
    );

    mount(
      hud(
        ["Streak", run.streak, "streak"],
        ["Score", run.score.toLocaleString("en-US"), "score"],
        ["Best streak", Math.max(prevBest, run.streak), "best"],
      ),
      h("div", { class: "companion-wrap" }, companionEl),
      h(
        "p",
        { class: "prompt", tabindex: "-1", "data-focus": true },
        "Which has more ",
        h("strong", {}, N.label.toLowerCase()),
        "?",
      ),
      h("p", { class: "prompt-sub" }, "Click the one you think is higher"),
      h(
        "div",
        { class: "duel" },
        leftCard,
        h("div", { class: "vs", "aria-hidden": "true" }, "VS"),
        rightCard,
      ),
      reveal,
    );
  }

  nextRound();
}

function hlSummary(ctx, run, prevBest, daily = false) {
  const wrong = run.log.filter((r) => !r.correct);
  const right = run.log.filter((r) => r.correct).sort((x, y) => x.gap - y.gap);
  const recap = [...wrong, ...right].slice(0, 3).map((r) => ({
    emoji: r.food.emoji,
    title: `${r.food.name} · ${NUTRIENTS[r.nutrient].label}: ${formatValue(r.nutrient, r.food.nutrients[r.nutrient])}`,
    tag: r.correct ? "Tough call you got right" : "You missed this one",
    text: r.fact,
  }));
  const prevScore = ctx.store.get().bestHlScore;
  const newBest = ctx.store.submitBest("bestHlScore", run.score);
  if (daily)
    ctx.store.completeDaily("hl", { score: run.score, streak: run.streak });
  return {
    heading: run.streak === 0 ? "Not this time" : "Run over",
    big: run.score.toLocaleString("en-US"),
    bigLabel: `points · ${run.streak} in a row${run.streak > prevBest ? " (new best streak!)" : ""}`,
    best: Math.max(prevScore, run.score),
    bestLabel: "Best duel score",
    newBest,
    daily,
    recap,
    sequence: run.sequence,
    misses: run.misses,
    share: `${GAME_NAME} - More/Less: ${run.score.toLocaleString("en-US")} pts, streak ${run.streak} 🔥 Can you beat it?`,
  };
}

/* -------------------------------------------------------- Guess the Value */

export function playGuess(ctx, { daily = false } = {}) {
  const rng = makeRng(daily ? dailySeed("guess") : undefined);
  const rounds = buildRounds({
    foods: poolFor(ctx),
    nutrients: ctx.store.enabledNutrients(),
    rng,
  });
  const prevBest = ctx.store.get().bestScore;
  const log = [];
  let i = 0;
  let total = 0;
  let goodStreak = 0; // consecutive rounds within 20%
  let goodCount = 0;
  let badCount = 0;
  const companionEl = makeCompanion();

  function draw() {
    const { food, nutrient } = rounds[i];
    const N = NUTRIENTS[nutrient];
    const truth = food.nutrients[nutrient];
    const card = foodCard(food, { nutrient, noValue: true });
    const reveal = h("div", { class: "reveal", "aria-live": "polite" });
    const error = h("p", { class: "error", role: "alert" }, "");
    const input = h("input", {
      id: "guess",
      class: "guess-input",
      type: "text",
      inputmode: "decimal",
      autocomplete: "off",
      placeholder: "0",
      "data-focus": true,
    });
    const submit = h(
      "button",
      { class: "btn btn-primary big", type: "submit" },
      "Lock it in",
    );

    const form = h(
      "form",
      {
        class: "guess-form",
        novalidate: true,
        onsubmit: (e) => {
          e.preventDefault();
          const guess = parseGuess(input.value);
          if (guess === null) {
            error.textContent = `Enter a number, like ${N.decimals ? "12.5" : "250"}.`;
            input.focus();
            return;
          }
          error.textContent = "";
          input.disabled = submit.disabled = true;
          finishRound(guess);
        },
      },
      h("label", { class: "sr-only", for: "guess" }, `Your guess in ${N.unit}`),
      h(
        "div",
        { class: "guess-row" },
        input,
        h("span", { class: "guess-unit" }, N.unit),
      ),
      error,
      submit,
    );

    function finishRound(guess) {
      const res = roundScore(guess, truth, nutrient, goodStreak);
      goodStreak = res.good ? goodStreak + 1 : 0;
      total += res.points;
      setHud("score", total.toLocaleString("en-US"));
      const fact = factFor(food, nutrient);
      log.push({ food, nutrient, guess, truth, ...res, fact });
      ctx.store.recordRound(nutrient, res.pctError > MISS_ERROR);

      if (res.good) goodCount += 1;
      else badCount += 1;
      const path = companionState(goodCount, badCount, i + 1);
      reactCompanion(companionEl, path);

      const truthNum = h("span", { class: "num" }, "0");
      const maxVal = Math.max(guess, truth, 1);
      const bar = (label, val, cls) =>
        h(
          "div",
          { class: "bar-row" },
          h("span", { class: "bar-label" }, label),
          h(
            "div",
            { class: "bar-track" },
            h("div", {
              class: `bar ${cls}`,
              style: `width:${Math.max(2, (val / maxVal) * 100)}%`,
            }),
          ),
          h("span", { class: "bar-val" }, formatValue(nutrient, val)),
        );

      const last = i === rounds.length - 1;
      const next = h(
        "button",
        {
          class: "btn btn-primary",
          onclick: () => {
            if (!last) {
              i += 1;
              draw();
            } else {
              showResults(ctx, guessSummary(ctx, log, total, prevBest, daily));
            }
          },
        },
        last ? "See results" : "Next food",
      );

      reveal.replaceChildren(
        h("p", { class: "truth" }, "Actual: ", truthNum, ` ${N.unit}`),
        h(
          "p",
          { class: `verdict ${res.pctError <= MISS_ERROR ? "good" : "bad"}` },
          res.badge
            ? `${res.badge === "Close" ? "👍" : "🎯"} ${res.badge}! `
            : "",
          `+${res.points.toLocaleString("en-US")} points`,
        ),
        h(
          "p",
          { class: "compare" },
          `${res.base} accuracy${res.bonus ? ` + ${res.bonus} ${res.badge.toLowerCase()} bonus` : ""}`,
          res.multiplier > 1 ? ` × ${res.multiplier} hot streak` : "",
          !res.good && goodStreak === 0 && i < rounds.length - 1
            ? " · within 20% to start a hot streak"
            : "",
        ),
        h(
          "div",
          { class: "bars" },
          bar("You", guess, "bar-you"),
          bar("Actual", truth, "bar-truth"),
        ),
        factCard(fact),
        ...wireSwaps([{ card, food }]),
        next,
      );
      countUp(truthNum, nutrient, truth);
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    mount(
      hud(
        ["Food", `${i + 1}/${rounds.length}`],
        ["Score", total.toLocaleString("en-US"), "score"],
      ),
      h("div", { class: "companion-wrap" }, companionEl),
      h(
        "section",
        { class: "guess-card" },
        card,
        nutrient === "calories"
          ? h(
              "p",
              { class: "prompt" },
              "How many ",
              h("strong", {}, "calories"),
              " (kcal) are in this serving?",
            )
          : h(
              "p",
              { class: "prompt" },
              "How much ",
              h("strong", {}, N.label.toLowerCase()),
              ` (${N.unit}) is in this serving?`,
            ),
        form,
        reveal,
      ),
    );
  }

  draw();
}

function guessSummary(ctx, log, total, prevBest, daily = false) {
  const newBest = ctx.store.submitBest("bestScore", total);
  if (daily) ctx.store.completeDaily("guess", { score: total });
  const max = maxTotal(log.length);
  const recap = [...log]
    .sort((x, y) => y.pctError - x.pctError)
    .slice(0, 3)
    .map((r) => ({
      emoji: r.food.emoji,
      title: `${r.food.name} · ${NUTRIENTS[r.nutrient].label}: you said ${formatValue(r.nutrient, r.guess)}, actual ${formatValue(r.nutrient, r.truth)}`,
      tag: `${r.points} pts`,
      text: r.fact,
    }));
  return {
    heading:
      total >= max * 0.5
        ? "Nutrition nerd!"
        : total >= max * 0.25
          ? "Nicely done"
          : "Room to learn",
    big: total.toLocaleString("en-US"),
    bigLabel: `out of ${max.toLocaleString("en-US")}`,
    daily,
    best: Math.max(prevBest, total),
    bestLabel: "Best score",
    newBest,
    rounds: log.map((r) => ({ emoji: r.food.emoji, points: r.points })),
    recap,
    sequence: log.map((r) => ({
      food: r.food,
      nutrient: r.nutrient,
      value: r.truth,
      note: `You said ${formatValue(r.nutrient, r.guess)} · ${r.points.toLocaleString("en-US")} pts`,
    })),
    misses: log.filter((r) => r.pctError > MISS_ERROR).map((r) => r.nutrient),
    share: `${GAME_NAME} - Guess the Value: ${total.toLocaleString("en-US")}/${max.toLocaleString("en-US")} 🎯 ${log.map((r) => (r.pctError <= 0.15 ? "🟩" : r.pctError <= MISS_ERROR ? "🟨" : "🟥")).join("")}`,
  };
}

/* --------------------------------------------------------------- Results */

/* Every food shown during the run (once each), with a way to see lighter versions. */
function foodListSection(sequence) {
  const byId = new Map();
  for (const row of sequence) {
    const entry = byId.get(row.food.id) ?? { food: row.food, asked: [] };
    if (!entry.asked.some((a) => a.nutrient === row.nutrient))
      entry.asked.push(row);
    byId.set(row.food.id, entry);
  }
  const items = [...byId.values()];
  const toggles = []; // one open/close function per row that has swaps

  const rows = items.map(({ food, asked }) => {
    const panel = h("div", { class: "seq-panel", hidden: true });
    let button = null;
    if (swapsFor(food).length) {
      const setOpen = (open) => {
        panel.hidden = !open;
        panel.replaceChildren(...(open ? [swapPanel(food)] : []));
        button.setAttribute("aria-expanded", String(open));
        button.textContent = open ? "Hide swaps" : "Make it healthier";
      };
      button = h(
        "button",
        {
          class: "btn btn-small",
          type: "button",
          "aria-expanded": "false",
          onclick: () => setOpen(panel.hidden),
        },
        "Make it healthier",
      );
      toggles.push(setOpen);
    }
    const flags = flagsFor(food);
    return h(
      "li",
      { class: "seq-item" },
      h(
        "div",
        { class: "seq-head" },
        h("div", { class: "seq-emoji", "aria-hidden": "true" }, food.emoji),
        h(
          "div",
          { class: "seq-info" },
          h(
            "strong",
            {},
            food.name,
            food.cuisine
              ? h("span", { class: "seq-cuisine" }, cuisineLabel(food.cuisine))
              : null,
          ),
          h("small", {}, food.serving.label),
          asked.map((a) =>
            h(
              "span",
              { class: "seq-asked" },
              `${NUTRIENTS[a.nutrient].label}: ${formatValue(a.nutrient, a.value)}`,
              a.note ? ` · ${a.note}` : "",
            ),
          ),
          flags.length
            ? h(
                "span",
                { class: "flags" },
                flags.map((n) => h("span", { class: "flag" }, HIGH[n].label)),
              )
            : null,
        ),
        button ?? h("span", { class: "seq-ok" }, "Nothing flagged"),
      ),
      panel,
    );
  });

  let allOpen = false;
  const allButton = h(
    "button",
    {
      class: "btn btn-primary",
      type: "button",
      onclick: () => {
        allOpen = !allOpen;
        toggles.forEach((setOpen) => setOpen(allOpen));
        allButton.textContent = allOpen
          ? "Hide healthier swaps"
          : "Make it healthier";
      },
    },
    "Make it healthier",
  );

  return h(
    "section",
    { class: "seq" },
    h("h2", { class: "section-title" }, `Foods in this run (${items.length})`),
    toggles.length
      ? h(
          "div",
          { class: "seq-actions" },
          allButton,
          h(
            "p",
            { class: "seq-note" },
            `${toggles.length} of ${items.length} have lighter ways to make them.`,
          ),
        )
      : h(
          "p",
          { class: "seq-note" },
          "None of these foods were flagged as high in fat, carbs, sodium or sugar.",
        ),
    h("ul", { class: "seq-list" }, rows),
  );
}

/* Which nutrients trip you up most (lifetime, this browser) and where to learn more. */
function statsSection(ctx, sum) {
  const stats = ctx.store.get().stats;
  const worst = weakest(stats, 3);
  const runMisses = Object.entries(countBy(sum.misses));
  const pct = (r) => Math.round(r * 100);

  const runLine = runMisses.length
    ? h(
        "p",
        { class: "stat-run" },
        "This run you missed: ",
        runMisses
          .map(([n, c]) => `${NUTRIENTS[n].label}${c > 1 ? ` ×${c}` : ""}`)
          .join(", "),
      )
    : h("p", { class: "stat-run" }, "No misses this run.");

  if (!worst.length) {
    return h(
      "section",
      { class: "stats" },
      h("h2", { class: "section-title" }, "Your trouble spots"),
      runLine,
      h(
        "p",
        { class: "seq-note" },
        totalAsked(stats) === 0
          ? "Play a few games and we'll show which nutrients trip you up."
          : `No clear trouble spot yet. Once you've been asked about a nutrient ${MIN_ASKED} times and missed some, it shows up here.`,
      ),
    );
  }

  const top = worst[0];
  const N = NUTRIENTS[top.nutrient];
  return h(
    "section",
    { class: "stats" },
    h("h2", { class: "section-title" }, "Your trouble spots"),
    runLine,
    h(
      "p",
      { class: "stat-main" },
      h("strong", {}, N.label),
      ` trips you up most: you've missed ${top.missed} of ${top.asked} rounds (${pct(top.rate)}%).`,
    ),
    h(
      "div",
      { class: "bars" },
      worst.map((w) =>
        h(
          "div",
          { class: "bar-row" },
          h(
            "span",
            { class: "bar-label stat-label" },
            NUTRIENTS[w.nutrient].label,
          ),
          h(
            "div",
            { class: "bar-track" },
            h("div", {
              class: "bar bar-miss",
              style: `width:${Math.max(3, pct(w.rate))}%`,
            }),
          ),
          h("span", { class: "bar-val" }, `${w.missed}/${w.asked}`),
        ),
      ),
    ),
    h(
      "div",
      { class: "improve" },
      h(
        "span",
        { class: "improve-title" },
        `Getting better at ${N.label.toLowerCase()}`,
      ),
      h("p", {}, N.learn.tip),
      h(
        "a",
        {
          class: "improve-link",
          href: N.learn.url,
          target: "_blank",
          rel: "noopener noreferrer",
        },
        `${N.learn.title} · ${N.learn.source} ↗`,
      ),
      h(
        "span",
        { class: "improve-note" },
        "Opens an outside website in a new tab.",
      ),
    ),
    h(
      "p",
      { class: "seq-note" },
      "Based on every game you've played in this browser.",
    ),
  );
}

export function showResults(ctx, sum) {
  const shareOut = h("input", {
    class: "share-out",
    readonly: true,
    hidden: true,
    "aria-label": "Share text",
  });
  const shareBtn = h(
    "button",
    {
      class: "btn",
      onclick: async () => {
        const text = `${sum.share} ${location.href.split("#")[0]}`;
        try {
          await navigator.clipboard.writeText(text);
          shareBtn.textContent = "Copied!";
        } catch {
          shareOut.value = text;
          shareOut.hidden = false;
          shareOut.select();
          shareBtn.textContent = "Copy the text below";
        }
      },
    },
    "Share",
  );

  mount(
    h(
      "section",
      { class: "screen center" },
      h("h1", { tabindex: "-1", "data-focus": true }, sum.heading),
      sum.daily
        ? h(
            "p",
            { class: "daily-note" },
            "✓ Today's daily is locked in — a new one tomorrow.",
          )
        : null,
      h(
        "div",
        { class: "big-score" },
        h("strong", {}, sum.big),
        h("span", {}, sum.bigLabel),
      ),
      h(
        "p",
        { class: "best-line" },
        sum.newBest
          ? "🏆 New personal best!"
          : `${sum.bestLabel}: ${typeof sum.best === "number" ? sum.best.toLocaleString("en-US") : sum.best}`,
      ),
      sum.rounds
        ? h(
            "p",
            { class: "round-dots", "aria-label": "Points per food" },
            sum.rounds.map((r) => h("span", {}, `${r.emoji} ${r.points}`)),
          )
        : null,
      sum.recap.length
        ? h(
            "div",
            { class: "recap" },
            h("h2", { class: "section-title" }, "What you learned"),
            sum.recap.map((r) =>
              h(
                "article",
                { class: "recap-item" },
                h(
                  "div",
                  { class: "recap-emoji", "aria-hidden": "true" },
                  r.emoji,
                ),
                h(
                  "div",
                  {},
                  h("p", { class: "recap-tag" }, r.tag),
                  h("h3", {}, r.title),
                  h("p", {}, r.text),
                ),
              ),
            ),
          )
        : null,
      foodListSection(sum.sequence ?? []),
      statsSection(ctx, sum),
      h(
        "div",
        { class: "actions wrap" },
        h(
          "button",
          {
            class: "btn btn-primary",
            onclick: () => startMode(ctx, ctx.lastMode),
          },
          "Play again",
        ),
        h(
          "button",
          { class: "btn", onclick: () => showSelect(ctx) },
          "Switch mode",
        ),
        shareBtn,
      ),
      shareOut,
    ),
  );
}
