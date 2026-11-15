// Persistent preferences + best scores. localStorage can be missing or throw
// (private windows, blocked storage), so everything is wrapped in try/catch
// and the game works fine without it.
import { CUISINES, GROUPS, NUTRIENTS, nutrientsForGroups } from "./data.js";

const KEY = "macroMatch.v1";
const defaults = () => ({
  bestStreak: 0,
  bestScore: 0,
  bestHlScore: 0,
  groups: GROUPS.filter((g) => g.default).map((g) => g.id),
  cuisines: CUISINES.map((c) => c.id),
  stats: {},
});

// Keep only well-formed { asked, missed } numbers for known nutrients.
function cleanStats(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [n, s] of Object.entries(raw)) {
    if (!NUTRIENTS[n] || !s) continue;
    const asked = Number.isFinite(s.asked)
      ? Math.max(0, Math.floor(s.asked))
      : 0;
    const missed = Number.isFinite(s.missed)
      ? Math.min(asked, Math.max(0, Math.floor(s.missed)))
      : 0;
    out[n] = { asked, missed };
  }
  return out;
}

let memory = null;

function read() {
  if (memory) return memory;
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    /* ignore */
  }
  const d = defaults();
  memory = {
    bestStreak: Number.isFinite(saved.bestStreak)
      ? saved.bestStreak
      : d.bestStreak,
    bestScore: Number.isFinite(saved.bestScore) ? saved.bestScore : d.bestScore,
    bestHlScore: Number.isFinite(saved.bestHlScore)
      ? saved.bestHlScore
      : d.bestHlScore,
    groups:
      Array.isArray(saved.groups) &&
      saved.groups.some((g) => GROUPS.some((x) => x.id === g))
        ? saved.groups.filter((g) => GROUPS.some((x) => x.id === g))
        : d.groups,
    cuisines:
      Array.isArray(saved.cuisines) &&
      saved.cuisines.some((c) => CUISINES.some((x) => x.id === c))
        ? saved.cuisines.filter((c) => CUISINES.some((x) => x.id === c))
        : d.cuisines,
    stats: cleanStats(saved.stats),
  };
  return memory;
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* ignore */
  }
}

export const store = {
  get: () => read(),
  setGroups(groups) {
    read().groups = groups;
    write();
  },
  setCuisines(cuisines) {
    read().cuisines = cuisines;
    write();
  },
  // Count one answered round for a nutrient (lifetime, this browser only).
  recordRound(nutrient, missed) {
    if (!NUTRIENTS[nutrient]) return;
    const stats = read().stats;
    const s = (stats[nutrient] ??= { asked: 0, missed: 0 });
    s.asked += 1;
    if (missed) s.missed += 1;
    write();
  },
  enabledNutrients: () => nutrientsForGroups(read().groups),
  // Returns true if this beat the previous best.
  submitBest(field, value) {
    const s = read();
    if (value > s[field]) {
      s[field] = value;
      write();
      return true;
    }
    return false;
  },
};
