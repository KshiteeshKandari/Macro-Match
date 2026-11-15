// Small DOM helpers and reusable components. No framework; components return nodes.
import { HIGH, NUTRIENTS, cuisineLabel, swapsFor } from "../data.js";
import { formatNumber } from "../util/format.js";

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function")
      el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

const app = () => document.getElementById("app");

// Replace the current screen and move focus to its first [data-focus] element.
export function mount(...nodes) {
  const root = app();
  root.replaceChildren(...nodes);
  const target = root.querySelector("[data-focus]");
  if (target) target.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

export function hud(...items) {
  return h(
    "div",
    { class: "hud" },
    items.map(([label, value, key]) =>
      h(
        "span",
        { class: "hud-item" },
        `${label} `,
        h("strong", key ? { "data-hud": key } : {}, value),
      ),
    ),
  );
}

export function setHud(key, value) {
  const el = app().querySelector(`[data-hud="${key}"]`);
  if (el) el.textContent = value;
}

// Emoji now; if a food has an `image`, prefer it (emoji is the fallback).
function foodVisual(food) {
  if (food.image) {
    return h("img", {
      class: "food-img",
      src: food.image,
      alt: "",
      loading: "lazy",
    });
  }
  return h("div", { class: "emoji", "aria-hidden": "true" }, food.emoji);
}

// opts: { nutrient, value (number|undefined => hidden "?"), noValue (omit the number row) }
export function foodCard(food, { nutrient, value, noValue = false }) {
  const N = NUTRIENTS[nutrient];
  const hidden = value === undefined;
  return h(
    "article",
    { class: "food-card" },
    foodVisual(food),
    food.cuisine
      ? h("p", { class: "cuisine-tag" }, cuisineLabel(food.cuisine))
      : null,
    h("h2", { class: "food-name" }, food.name),
    h("p", { class: "serving" }, food.serving.label),
    noValue
      ? null
      : h(
          "p",
          { class: "value" },
          h(
            "span",
            { class: "num" },
            hidden ? "?" : formatNumber(nutrient, value),
          ),
          " ",
          h(
            "span",
            { class: "unit" },
            nutrient === "calories"
              ? "kcal"
              : `${N.unit} ${N.label.toLowerCase()}`,
          ),
        ),
  );
}

// Turn a food card into a big clickable tile (mouse, touch, Enter/Space).
// Returns lock(), which removes the behavior once an answer is chosen.
export function makeTile(card, label, onPick) {
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick();
    }
  };
  card.classList.add("tile");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", label);
  card.addEventListener("click", onPick);
  card.addEventListener("keydown", onKey);
  return function lock() {
    card.removeEventListener("click", onPick);
    card.removeEventListener("keydown", onKey);
    card.classList.remove("tile");
    card.classList.add("locked");
    for (const attr of ["role", "tabindex", "aria-label"])
      card.removeAttribute(attr);
  };
}

export function swapPanel(food) {
  return h(
    "section",
    { class: "swap-panel" },
    h(
      "h3",
      {},
      `Lighter ways to ${food.cuisine ? "cook" : "enjoy"} ${food.name}`,
    ),
    h(
      "ul",
      {},
      swapsFor(food).map((s) =>
        h(
          "li",
          {},
          h("strong", {}, HIGH[s.nutrient].label),
          h("span", {}, s.tip),
          s.ingredients?.length
            ? h(
                "div",
                { class: "ing" },
                h("span", { class: "ing-title" }, "Ingredient swaps"),
                s.ingredients.map((i) =>
                  h(
                    "div",
                    { class: "ing-row" },
                    h("span", { class: "from" }, i.from),
                    h("span", { class: "arrow", "aria-hidden": "true" }, "→"),
                    h("span", { class: "sr-only" }, " can be swapped for "),
                    h("span", { class: "to" }, i.to),
                  ),
                ),
              )
            : null,
        ),
      ),
    ),
    h(
      "p",
      { class: "swap-note" },
      "Ideas that keep the dish's character. Every kitchen does it a little differently.",
    ),
  );
}

// After an answer, add an "i" button to each revealed card that has cooking swaps.
// entries: [{ card, food }]. Returns the nodes to append to the reveal area
// (a one-line hint and the panel container), or [] if no card has swaps.
export function wireSwaps(entries) {
  const withSwaps = entries.filter((e) => swapsFor(e.food).length);
  if (!withSwaps.length) return [];

  const box = h("div", { class: "swap-box", "aria-live": "polite" });
  const buttons = [];
  let openId = null;

  for (const { card, food } of withSwaps) {
    const btn = h(
      "button",
      {
        class: "info-btn",
        type: "button",
        "aria-expanded": "false",
        "aria-label": `Cooking swaps for ${food.name}`,
        title: "Cooking swaps",
        onclick: () => {
          openId = openId === food.id ? null : food.id;
          box.replaceChildren(...(openId ? [swapPanel(food)] : []));
          for (const b of buttons)
            b.el.setAttribute("aria-expanded", String(b.id === openId));
        },
      },
      "i",
    );
    card.append(btn);
    buttons.push({ el: btn, id: food.id });
  }

  const list = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  });
  const hint = withSwaps
    .map(({ food }) => {
      const what = swapsFor(food).map((s) =>
        HIGH[s.nutrient].label.replace("High ", ""),
      );
      return `${food.name} is high in ${list.format(what)}`;
    })
    .join(". ");
  return [
    h(
      "p",
      { class: "swap-hint" },
      `${hint}. Tap the `,
      h("b", {}, "i"),
      " on the card for lighter cooking swaps.",
    ),
    box,
  ];
}

export function factCard(text) {
  return h(
    "aside",
    { class: "fact" },
    h("span", { class: "fact-label" }, "Did you know?"),
    h("p", {}, text),
  );
}
