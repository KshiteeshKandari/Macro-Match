// Lifetime per-nutrient accuracy: stats = { sodium: { asked: 9, missed: 4 }, ... }.
import { NUTRIENTS } from "./data.js";

// A nutrient needs this many rounds before it can be called a trouble spot.
export const MIN_ASKED = 3;

// A Guess the Value round counts as a miss when the guess is more than 50% off (MISS_ERROR).
export { MISS_ERROR } from "./modes/guessValue.js";

// Nutrients you miss most, worst first. Ties break on more misses, then more rounds.
export function weakest(stats, limit = 3) {
  return Object.entries(stats ?? {})
    .filter(([n, s]) => NUTRIENTS[n] && s.asked >= MIN_ASKED && s.missed > 0)
    .map(([nutrient, s]) => ({
      nutrient,
      asked: s.asked,
      missed: s.missed,
      rate: s.missed / s.asked,
    }))
    .sort((a, b) => b.rate - a.rate || b.missed - a.missed || b.asked - a.asked)
    .slice(0, limit);
}

export const totalAsked = (stats) =>
  Object.values(stats ?? {}).reduce((n, s) => n + (s.asked || 0), 0);

// Counts like { sodium: 2, fat: 1 } from a list of nutrient keys.
export function countBy(list) {
  const out = {};
  for (const k of list ?? []) out[k] = (out[k] || 0) + 1;
  return out;
}
