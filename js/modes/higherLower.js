// More / Less: pair selection with a gap band that narrows as the streak grows.
import { pick } from "../util/rng.js";

// gap = |a - b| / max(a, b)  (0 = identical, 1 = one side is zero)
export const BANDS = [
  { min: 0, max: 3, lo: 0.6, hi: 1 }, // obvious
  { min: 4, max: 8, lo: 0.3, hi: 0.6 }, // moderate
  { min: 9, max: 14, lo: 0.15, hi: 0.3 }, // tricky
  { min: 15, max: Infinity, lo: 0.05, hi: 0.15 }, // expert
];

export const RECENT_WINDOW = 10;

export function gapOf(a, b) {
  const m = Math.max(a, b);
  return m === 0 ? 0 : Math.abs(a - b) / m;
}

// Score for a correct pick: 100 base + up to 100 for a close call, times a streak multiplier
// (+10% per correct pick already in the streak, capped at x2).
export const HL_BASE = 100;
export const hlMultiplier = (streak) =>
  1 + 0.1 * Math.min(Math.max(0, streak), 10);
export function hlPoints(gap, streak) {
  const g = Math.min(1, Math.max(0, gap));
  return Math.round((HL_BASE + HL_BASE * (1 - g)) * hlMultiplier(streak));
}

export function bandFor(streak) {
  return (
    BANDS.find((b) => streak >= b.min && streak <= b.max) ??
    BANDS[BANDS.length - 1]
  );
}

export function pickNutrient(nutrients, previous, rng) {
  const options =
    nutrients.length > 1 ? nutrients.filter((n) => n !== previous) : nutrients;
  return pick(options, rng);
}

// Two foods for one round (both values hidden), in random left/right order.
// Uses the same gap bands as pickNext, anchored on a food that wasn't shown recently.
export function pickPair({ foods, nutrient, streak, history, rng }) {
  const windowSize = Math.min(RECENT_WINDOW, Math.floor(foods.length / 2));
  const recent = new Set(history.slice(-windowSize));
  const fresh = foods.filter((f) => !recent.has(f.id));
  const anchor = pick(fresh.length ? fresh : foods, rng);
  const partner = pickNext({
    foods,
    nutrient,
    streak,
    current: anchor,
    history: [...history, anchor.id],
    rng,
  });
  return rng() < 0.5 ? [anchor, partner] : [partner, anchor];
}

// Choose the next hidden food (B) to compare against the revealed food (A).
// `history` = ids already shown, oldest first (includes A).
export function pickNext({ foods, nutrient, streak, current, history, rng }) {
  const va = current.nutrients[nutrient];
  // Small pools (a single cuisine) can't avoid 10 repeats, so shrink the window.
  const windowSize = Math.min(RECENT_WINDOW, Math.floor(foods.length / 2));
  const recent = new Set(history.slice(-windowSize));
  const base = foods.filter(
    (f) => f.id !== current.id && f.nutrients[nutrient] !== va,
  );

  const inBand = (pool, lo, hi) =>
    pool.filter((f) => {
      const g = gapOf(va, f.nutrients[nutrient]);
      return g >= lo && g <= hi;
    });

  const fresh = base.filter((f) => !recent.has(f.id));
  let { lo, hi } = bandFor(streak);

  // Widen the band step by step until something fits, then relax the repeat rule.
  for (let i = 0; i < 6; i++) {
    const hit = inBand(fresh, lo, hi);
    if (hit.length) return pick(hit, rng);
    lo = lo / 2;
    hi = Math.min(1, hi * 1.5);
  }
  const anyFresh = fresh.length ? fresh : base;
  return pick(anyFresh, rng);
}
