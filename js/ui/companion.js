// A small pixel-art companion shown during play. It idles continuously and
// reacts to the run's trend: a good trend settles into its own gym-outfit
// loop, a bad trend into its own couch-outfit loop, each with its own
// standing/holding/eating frames (no falling back to the pajama ones).
// Sprite sheet: 8 columns x 2 rows (assets/companion-sprite.webp).
//   col 0-2: neutral / holding food / eating food, pajamas (shared, no path yet)
//   col 3:   standing, in that row's outfit
//   col 5:   "hit" flourish (flex / biggest-belly) — played once on entering a path
//   col 6-7: holding food / eating food, in that row's outfit
//   row 0 = gym (good), row 1 = couch (bad)
import { h } from "./components.js";

const COL_W = 63;
const ROW_H = 126;
const NEUTRAL_FRAMES = [0, 1, 2];
const PATH_FRAMES = [3, 6, 7]; // standing, holding, eating — in-path outfit
const HIT_COL = 5;
const NEUTRAL_STEP_MS = 600;
const PATH_STEP_MS = 600;
const HIT_HOLD_MS = 500;

export function makeCompanion() {
  const el = h("div", { class: "companion", "aria-hidden": "true" });
  el._path = "neutral";
  startNeutralIdle(el);
  return el;
}

function paint(el, col, row) {
  el.style.backgroundPosition = `${-col * COL_W}px ${-row * ROW_H}px`;
}

function stopTimers(el) {
  if (el._idleTimer) {
    clearInterval(el._idleTimer);
    el._idleTimer = null;
  }
  if (el._hitTimer) {
    clearTimeout(el._hitTimer);
    el._hitTimer = null;
  }
}

function startNeutralIdle(el) {
  stopTimers(el);
  let i = 0;
  paint(el, NEUTRAL_FRAMES[0], 0);
  el._idleTimer = setInterval(() => {
    i = (i + 1) % NEUTRAL_FRAMES.length;
    paint(el, NEUTRAL_FRAMES[i], 0);
  }, NEUTRAL_STEP_MS);
}

function startPathIdle(el, row) {
  stopTimers(el);
  let i = 0;
  paint(el, PATH_FRAMES[0], row);
  el._idleTimer = setInterval(() => {
    i = (i + 1) % PATH_FRAMES.length;
    paint(el, PATH_FRAMES[i], row);
  }, PATH_STEP_MS);
}

// Updates the companion toward the given path ('neutral' | 'gym' | 'bad').
// Only animates when the path actually changes — plays the one-time "hit"
// frame for that outfit, then settles into its own standing/holding/eating
// loop. Staying on the same path just lets the current loop keep going.
export function reactCompanion(el, path) {
  if (path === el._path) return;
  el._path = path;
  if (path === "neutral") {
    startNeutralIdle(el);
    return;
  }
  stopTimers(el);
  const row = path === "bad" ? 1 : 0;
  paint(el, HIT_COL, row);
  el._hitTimer = setTimeout(() => {
    el._hitTimer = null;
    startPathIdle(el, row);
  }, HIT_HOLD_MS);
}

// Cumulative good/bad round counts -> 'neutral' | 'gym' | 'bad'. The first
// round always stays neutral — one data point isn't enough to react to.
export function companionState(goodCount, badCount, roundNumber) {
  if (roundNumber <= 1) return "neutral";
  const net = goodCount - badCount;
  if (net > 0) return "gym";
  if (net < 0) return "bad";
  return "neutral";
}
