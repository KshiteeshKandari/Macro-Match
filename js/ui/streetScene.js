// A small decorative runner animation for the home screen: a pajama-clad
// character on a 6-frame run cycle (row 1 of the sprite sheet only — row 2
// is a near-duplicate and ping-ponging between rows made the character
// appear to run backward). Loops forward continuously.
import { h } from "./components.js";

const COLS = 6;
const STEP_MS = 120;

// Display cell size (px). Native cell is 334x334.
const RUN_CELL = 84;

export function makeStreetScene() {
  const runner = h("div", { class: "street-runner" });
  const el = h("div", { class: "street-scene", "aria-hidden": "true" }, runner);

  let frame = 0;
  let timer = null;

  function paint() {
    runner.style.backgroundPosition = `${-frame * RUN_CELL}px 0px`;
  }

  function tick() {
    frame = (frame + 1) % COLS;
    paint();
  }

  function start() {
    if (timer) return;
    paint();
    timer = setInterval(tick, STEP_MS);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  paint();
  return { el, start, stop };
}
