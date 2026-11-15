import { NUTRIENTS } from "../data.js";

// Round a nutrient value for display (whole numbers for big units, 1 decimal otherwise).
export function roundFor(nutrient, value) {
  const d = NUTRIENTS[nutrient].decimals;
  const f = 10 ** d;
  return Math.round(value * f) / f;
}

export function formatNumber(nutrient, value) {
  return roundFor(nutrient, value).toLocaleString("en-US", {
    maximumFractionDigits: NUTRIENTS[nutrient].decimals,
  });
}

export function formatValue(nutrient, value) {
  return `${formatNumber(nutrient, value)} ${NUTRIENTS[nutrient].unit}`;
}

export function reducedMotion() {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Count an element's text up to `to` (nutrient-aware formatting).
export function countUp(el, nutrient, to, ms = 600) {
  if (reducedMotion() || ms <= 0) {
    el.textContent = formatNumber(nutrient, to);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = formatNumber(nutrient, to * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
