// Guess the Value: closeness-based scoring and round building.
//
// Per round:  base = 1000 * (1 - error)^2   (error = |guess - truth| / max(truth, scale), capped at 1)
//           + accuracy bonus (Perfect +500, Bullseye <=5% +250, Close <=15% +100)
//           x hot-streak multiplier (1.25 after one good round in a row, 1.5 after two or more)
// A "good" round is within 20%. The curve makes accuracy pay far more than a lucky ballpark guess.
import { NUTRIENTS } from "../data.js";
import { pick, shuffle } from "../util/rng.js";

export const ROUNDS = 5;
export const MAX_POINTS = 1000;
export const GOOD_ERROR = 0.2; // within 20% keeps the hot streak alive
export const MISS_ERROR = 0.5; // more than 50% off counts as a miss for stats
export const BONUSES = [
  { max: 0, label: "Perfect", points: 500 },
  { max: 0.05, label: "Bullseye", points: 250 },
  { max: 0.15, label: "Close", points: 100 },
];
export const STREAK_MULTIPLIERS = [1, 1.25, 1.5]; // indexed by consecutive good rounds, capped

// Points before the hot-streak multiplier. pctError is relative to max(truth, nutrient.scale)
// so truth = 0 never divides by zero.
export function scoreGuess(guess, truth, nutrient) {
  const scale = NUTRIENTS[nutrient].scale;
  const pctError = Math.abs(guess - truth) / Math.max(truth, scale);
  const base = Math.round(MAX_POINTS * (1 - Math.min(1, pctError)) ** 2);
  const tier = BONUSES.find((b) => pctError <= b.max);
  const bonus = tier ? tier.points : 0;
  return {
    base,
    bonus,
    points: base + bonus,
    pctError,
    badge: tier ? tier.label : null,
  };
}

export const streakMultiplier = (goodStreak) =>
  STREAK_MULTIPLIERS[
    Math.min(Math.max(0, goodStreak), STREAK_MULTIPLIERS.length - 1)
  ];

// Full round result. goodStreak = good rounds in a row just before this one.
export function roundScore(guess, truth, nutrient, goodStreak = 0) {
  const r = scoreGuess(guess, truth, nutrient);
  const multiplier = streakMultiplier(goodStreak);
  return {
    ...r,
    multiplier,
    points: Math.round(r.points * multiplier),
    good: r.pctError <= GOOD_ERROR,
  };
}

// Best possible total for n rounds (all perfect).
export function maxTotal(n = ROUNDS) {
  let sum = 0;
  for (let i = 0; i < n; i++)
    sum += (MAX_POINTS + BONUSES[0].points) * streakMultiplier(i);
  return Math.round(sum);
}

// Accepts "250", "12.5", " 7 " (and a comma decimal). Returns null when invalid.
export function parseGuess(text) {
  const cleaned = String(text ?? "")
    .trim()
    .replace(",", ".");
  if (!/^\d*\.?\d+$|^\d+\.$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Distinct foods, each with a nutrient where the answer is > 0.
export function buildRounds({ foods, nutrients, count = ROUNDS, rng }) {
  const rounds = [];
  let prev = null;
  for (const food of shuffle(foods, rng)) {
    if (rounds.length >= count) break;
    const options = nutrients.filter(
      (n) => food.nutrients[n] > 0 && !(nutrients.length > 1 && n === prev),
    );
    if (!options.length) continue;
    const nutrient = pick(options, rng);
    prev = nutrient;
    rounds.push({ food, nutrient });
  }
  return rounds;
}
