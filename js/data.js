// Nutrient definitions + food data loading/validation.
//
// `scale` is the smallest error denominator used when scoring guesses, so tiny
// values (e.g. 0.3 g of fat) don't make scoring impossibly harsh.
//
// `learn` powers the "trouble spots" block on the results page: a one-line way to do
// better plus an outside link (opened in a new tab). All links were checked to resolve.
const NS = "Harvard Nutrition Source";
export const NUTRIENTS = {
  calories: {
    label: "Calories",
    unit: "kcal",
    scale: 20,
    decimals: 0,
    learn: {
      source: "NHS",
      title: "Understanding calories",
      url: "https://www.nhs.uk/live-well/healthy-weight/understanding-calories/",
      tip: "Portion size and extras (oils, sauces, sugary drinks) move calories the most. Compare foods per serving, not per bite.",
    },
  },
  protein: {
    label: "Protein",
    unit: "g",
    scale: 2,
    decimals: 1,
    learn: {
      source: NS,
      title: "Protein",
      url: "https://nutritionsource.hsph.harvard.edu/what-should-you-eat/protein/",
      tip: "Meat, fish, eggs, dairy, beans, lentils and tofu are the dense sources. Beans and lentils bring fiber along with their protein.",
    },
  },
  carbs: {
    label: "Carbohydrates",
    unit: "g",
    scale: 3,
    decimals: 1,
    learn: {
      source: NS,
      title: "Carbohydrates",
      url: "https://nutritionsource.hsph.harvard.edu/carbohydrates/",
      tip: "Starchy staples like rice, noodles, bread and tortillas pile up fast on a plate. Smaller portions plus more vegetables keep carbs in check.",
    },
  },
  fat: {
    label: "Fat",
    unit: "g",
    scale: 2,
    decimals: 1,
    learn: {
      source: NS,
      title: "Fats and cholesterol",
      url: "https://nutritionsource.hsph.harvard.edu/what-should-you-eat/fats-and-cholesterol/",
      tip: "Frying and cream- or cheese-heavy sauces add the most fat. Baking, grilling, and swapping in olive oil or yogurt lighten a dish.",
    },
  },
  sugar: {
    label: "Sugar",
    unit: "g",
    scale: 2,
    decimals: 1,
    learn: {
      source: NS,
      title: "Added sugar",
      url: "https://nutritionsource.hsph.harvard.edu/added-sugar-in-the-diet/",
      tip: 'Sugar hides in drinks, sauces and "healthy" snacks like flavored yogurt. Check labels for added sugars and sweeten with whole fruit.',
    },
  },
  sodium: {
    label: "Sodium",
    unit: "mg",
    scale: 30,
    decimals: 0,
    learn: {
      source: NS,
      title: "Salt and sodium",
      url: "https://nutritionsource.hsph.harvard.edu/salt-and-sodium/",
      tip: "Most sodium comes from sauces, soups, breads and processed meats, not the salt shaker. Season with herbs, citrus and spices, and rinse canned foods.",
    },
  },
  fiber: {
    label: "Fiber",
    unit: "g",
    scale: 1,
    decimals: 1,
    learn: {
      source: NS,
      title: "Fiber",
      url: "https://nutritionsource.hsph.harvard.edu/carbohydrates/fiber/",
      tip: "Fiber lives in beans, lentils, whole grains, vegetables and fruit with the skin on. Swapping white grains for whole grains is an easy start.",
    },
  },
  vitaminC: {
    label: "Vitamin C",
    unit: "mg",
    scale: 4,
    decimals: 1,
    learn: {
      source: NS,
      title: "Vitamin C",
      url: "https://nutritionsource.hsph.harvard.edu/vitamin-c/",
      tip: "Citrus, peppers, broccoli and strawberries are rich in vitamin C. Long cooking reduces it, so enjoy some of them raw.",
    },
  },
  iron: {
    label: "Iron",
    unit: "mg",
    scale: 0.5,
    decimals: 1,
    learn: {
      source: NS,
      title: "Iron",
      url: "https://nutritionsource.hsph.harvard.edu/iron/",
      tip: "Red meat, lentils, beans and spinach contain iron. Pair plant sources with vitamin C foods to help your body absorb more.",
    },
  },
  calcium: {
    label: "Calcium",
    unit: "mg",
    scale: 20,
    decimals: 0,
    learn: {
      source: NS,
      title: "Calcium",
      url: "https://nutritionsource.hsph.harvard.edu/calcium/",
      tip: "Dairy, calcium-set tofu, canned fish with bones, and greens like collards and bok choy all supply calcium.",
    },
  },
};

export const GROUPS = [
  {
    id: "basics",
    label: "Basics",
    hint: "Calories",
    nutrients: ["calories"],
    default: true,
  },
  {
    id: "macros",
    label: "Macros",
    hint: "Protein, carbs, fat",
    nutrients: ["protein", "carbs", "fat"],
    default: true,
  },
  {
    id: "watch",
    label: "Watch-outs",
    hint: "Sugar, sodium",
    nutrients: ["sugar", "sodium"],
    default: true,
  },
  {
    id: "micros",
    label: "Micros",
    hint: "Fiber, vitamin C, iron, calcium",
    nutrients: ["fiber", "vitaminC", "iron", "calcium"],
    default: false,
  },
];

export const nutrientsForGroups = (groupIds) =>
  GROUPS.filter((g) => groupIds.includes(g.id)).flatMap((g) => g.nutrients);

// Cuisines. Generic foods (data/foods.json) have no `cuisine` and count as "everyday".
export const CUISINES = [
  { id: "everyday", label: "Everyday foods", emoji: "🍽️" },
  { id: "indian", label: "Indian", emoji: "🍛" },
  { id: "mexican", label: "Mexican", emoji: "🌮" },
  { id: "italian", label: "Italian", emoji: "🍝" },
  { id: "chinese", label: "Chinese", emoji: "🥟" },
  { id: "japanese", label: "Japanese", emoji: "🍣" },
  { id: "middle-eastern", label: "Middle Eastern", emoji: "🧆" },
  { id: "korean", label: "Korean", emoji: "🍲" },
  { id: "thai", label: "Thai", emoji: "🍜" },
  { id: "vietnamese", label: "Vietnamese", emoji: "🥖" },
  { id: "ethiopian", label: "Ethiopian", emoji: "🥘" },
  { id: "greek", label: "Greek", emoji: "🥙" },
];

export const cuisineOf = (food) => food.cuisine ?? "everyday";
export const cuisineLabel = (id) =>
  CUISINES.find((c) => c.id === id)?.label ?? id;

// A serving counts as "high" in a nutrient at or above these amounts.
// Only these nutrients get cooking swaps.
export const HIGH = {
  fat: { min: 20, label: "High fat" },
  carbs: { min: 60, label: "High carbs" },
  sodium: { min: 800, label: "High sodium" },
  sugar: { min: 25, label: "High sugar" },
};

export const flagsFor = (food) =>
  Object.keys(HIGH).filter((n) => food.nutrients[n] >= HIGH[n].min);

// Swap tips to show: authored tips for the nutrients this dish is actually high in.
export const swapsFor = (food) => {
  const flagged = new Set(flagsFor(food));
  return (food.swaps ?? []).filter((s) => flagged.has(s.nutrient) && s.tip);
};

// Returns an array of problems for one food (empty array = valid).
export function validateFood(f) {
  const problems = [];
  if (!f || typeof f !== "object") return ["not an object"];
  if (!f.id || typeof f.id !== "string") problems.push("missing id");
  if (!f.name) problems.push("missing name");
  if (!f.emoji) problems.push("missing emoji");
  if (!f.serving?.label) problems.push("missing serving label");
  if (!(f.serving?.grams > 0)) problems.push("missing serving grams");
  if (f.cuisine !== undefined && !CUISINES.some((c) => c.id === f.cuisine))
    problems.push(`unknown cuisine "${f.cuisine}"`);
  if (f.swaps !== undefined && !Array.isArray(f.swaps))
    problems.push("swaps must be an array");
  for (const key of Object.keys(NUTRIENTS)) {
    const v = f.nutrients?.[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
      problems.push(`bad nutrient "${key}"`);
  }
  return problems;
}

export const DATA_URLS = [
  "data/foods.json",
  "data/dishes.json",
  "data/dishes-2.json",
];

// Ingredient swaps live in one file keyed by dish id, then nutrient: { "dish-id": { "fat": [[from, to], ...] } }.
// They are merged onto each dish's matching swap entry as `ingredients: [{ from, to }]`.
export const SWAP_URL = "data/ingredient-swaps.json";

export function applyIngredientSwaps(foods, map) {
  for (const food of foods) {
    const byNutrient = map?.[food.id];
    if (!byNutrient) continue;
    for (const swap of food.swaps ?? []) {
      const pairs = byNutrient[swap.nutrient];
      if (Array.isArray(pairs))
        swap.ingredients = pairs.map(([from, to]) => ({ from, to }));
    }
  }
}

export async function loadFoods(urls = DATA_URLS, swapUrl = SWAP_URL) {
  const lists = await Promise.all(
    urls.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
      const data = await res.json();
      return Array.isArray(data) ? data : data.foods;
    }),
  );
  const list = lists.flat();
  const seen = new Set();
  const foods = [];
  for (const f of list) {
    const problems = validateFood(f);
    if (seen.has(f?.id)) problems.push("duplicate id");
    if (problems.length) {
      console.warn(`Skipping food ${f?.id ?? "?"}: ${problems.join(", ")}`);
      continue;
    }
    seen.add(f.id);
    foods.push(f);
  }
  if (foods.length < 10) throw new Error("Not enough valid foods loaded.");

  // Ingredient swaps are an enhancement: if the file is missing, the tips still work.
  if (swapUrl) {
    try {
      const res = await fetch(swapUrl);
      if (res.ok) applyIngredientSwaps(foods, await res.json());
      else console.warn(`Could not load ${swapUrl} (${res.status})`);
    } catch (err) {
      console.warn(`Could not load ${swapUrl}`, err);
    }
  }
  return foods;
}

// Fun-fact fallback order: nutrient-specific -> generic -> computed.
export function factFor(food, nutrient) {
  const specific = food.facts?.[nutrient];
  if (specific) return specific;
  if (food.genericFact) return food.genericFact;
  const n = NUTRIENTS[nutrient];
  return `${food.name} (${food.serving.label}) has ${food.nutrients[nutrient]} ${n.unit} of ${n.label.toLowerCase()}.`;
}
