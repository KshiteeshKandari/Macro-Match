import { loadFoods } from "./data.js";
import { store } from "./state.js";
import { h, mount } from "./ui/components.js";
import { showHome } from "./ui/screens.js";

async function init() {
  document.getElementById("home-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (ctx) showHome(ctx);
  });

  const dialog = document.getElementById("help-dialog");
  document
    .getElementById("help-btn")
    ?.addEventListener("click", () => dialog?.showModal?.());
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  let foods;
  try {
    foods = await loadFoods();
  } catch (err) {
    console.error(err);
    mount(
      h(
        "section",
        { class: "screen center" },
        h(
          "h1",
          { tabindex: "-1", "data-focus": true },
          "Could not load the food data",
        ),
        h("p", {}, String(err.message || err)),
        h(
          "p",
          {},
          "Run serve.ps1 and open http://localhost:8080/ instead of opening index.html directly.",
        ),
      ),
    );
    return;
  }
  ctx = { foods, store, lastMode: "hl" };
  showHome(ctx);
}

let ctx = null;
init();
