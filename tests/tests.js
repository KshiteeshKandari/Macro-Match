// Browser-run tests (no Node needed). Open http://localhost:8080/tests/ via serve.ps1.
import { CUISINES, HIGH, NUTRIENTS, cuisineOf, flagsFor, loadFoods, swapsFor, validateFood, factFor } from '../js/data.js';
import { scoreGuess, roundScore, streakMultiplier, maxTotal, parseGuess, buildRounds } from '../js/modes/guessValue.js';
import { BANDS, bandFor, gapOf, hlPoints, pickNext, pickNutrient, pickPair } from '../js/modes/higherLower.js';
import { MIN_ASKED, countBy, totalAsked, weakest } from '../js/stats.js';
import { makeRng } from '../js/util/rng.js';
import { formatNumber } from '../js/util/format.js';

const out = document.getElementById('out');
let passed = 0;
let failed = 0;

function test(name, fn) {
  const li = document.createElement('li');
  try {
    fn();
    passed++;
    li.className = 'pass';
    li.textContent = `PASS  ${name}`;
  } catch (e) {
    failed++;
    li.className = 'fail';
    li.textContent = `FAIL  ${name}: ${e.message}`;
  }
  out.append(li);
}
function warn(msg) {
  const li = document.createElement('li');
  li.className = 'warn';
  li.textContent = `WARN  ${msg}`;
  out.append(li);
}
const eq = (a, b, m = '') => { if (a !== b) throw new Error(`${m} expected ${b}, got ${a}`); };
const ok = (c, m = 'assertion failed') => { if (!c) throw new Error(m); };

const URLS = ['../data/foods.json', '../data/dishes.json', '../data/dishes-2.json'];
const SWAP_FILE = '../data/ingredient-swaps.json';
const foods = await loadFoods(URLS, SWAP_FILE);
const swapMap = await (await fetch(SWAP_FILE)).json();
const await_raw = (await Promise.all(URLS.map(async (u) => (await fetch(u)).json()))).flat();
const dishes = foods.filter((f) => f.cuisine);

/* ---------- scoring ---------- */
test('exact guess = 1000 + 500 Perfect bonus', () => {
  const r = scoreGuess(100, 100, 'calories');
  eq(r.base, 1000); eq(r.bonus, 500); eq(r.points, 1500); eq(r.badge, 'Perfect');
});
test('4% off = curved 922 + 250 Bullseye', () => {
  const r = scoreGuess(104, 100, 'calories');
  eq(r.base, 922); eq(r.points, 1172); eq(r.badge, 'Bullseye');
});
test('10% off = curved 810 + 100 Close', () => {
  const r = scoreGuess(110, 100, 'calories');
  eq(r.base, 810); eq(r.points, 910); eq(r.badge, 'Close');
});
test('curve: 20% off = 640, 50% off = 250, no bonus', () => {
  const a = scoreGuess(120, 100, 'calories');
  eq(a.base, 640); eq(a.bonus, 0); eq(a.badge, null);
  eq(scoreGuess(150, 100, 'calories').points, 250);
});
test('accuracy pays: a close guess beats a ballpark one by 3x+', () => {
  ok(scoreGuess(110, 100, 'calories').points > 3 * scoreGuess(150, 100, 'calories').points);
});
test('100% off or more = 0', () => {
  eq(scoreGuess(200, 100, 'calories').points, 0);
  eq(scoreGuess(5000, 100, 'calories').points, 0);
});
test('truth = 0 does not divide by zero (uses nutrient scale)', () => {
  const r = scoreGuess(0, 0, 'sugar');
  ok(Number.isFinite(r.points)); eq(r.points, 1500);
  eq(scoreGuess(1, 0, 'sugar').base, 250); // scale for sugar is 2 -> 50% off
});
test('hot-streak multiplier: x1, x1.25, then x1.5 (capped)', () => {
  eq(streakMultiplier(0), 1); eq(streakMultiplier(1), 1.25); eq(streakMultiplier(2), 1.5); eq(streakMultiplier(9), 1.5);
  eq(roundScore(110, 100, 'calories', 0).points, 910);
  eq(roundScore(110, 100, 'calories', 1).points, Math.round(910 * 1.25));
  eq(roundScore(110, 100, 'calories', 2).points, Math.round(910 * 1.5));
});
test('good round = within 20%', () => {
  ok(roundScore(120, 100, 'calories').good); ok(!roundScore(130, 100, 'calories').good);
});
test('maxTotal for 5 rounds = 10125 and matches an all-perfect game', () => {
  eq(maxTotal(5), 10125);
  let t = 0;
  for (let i = 0; i < 5; i++) t += roundScore(100, 100, 'calories', i).points;
  eq(t, maxTotal(5));
});
test('higher/lower points: close calls and long streaks pay more, capped', () => {
  eq(hlPoints(1, 0), 100); eq(hlPoints(0, 0), 200); eq(hlPoints(0.5, 0), 150);
  ok(hlPoints(0.1, 0) > hlPoints(0.9, 0));
  eq(hlPoints(0.5, 5), 225); eq(hlPoints(0.5, 10), 300); eq(hlPoints(0.5, 50), 300);
});
test('under-guess scores same as equal over-guess', () => {
  eq(scoreGuess(80, 100, 'calories').points, scoreGuess(120, 100, 'calories').points);
});
test('guess of 0 on a real value scores 0', () => eq(scoreGuess(0, 250, 'calories').points, 0));

/* ---------- input parsing ---------- */
test('parseGuess accepts numbers', () => {
  eq(parseGuess('250'), 250); eq(parseGuess(' 12.5 '), 12.5); eq(parseGuess('7,5'), 7.5); eq(parseGuess('.5'), 0.5); eq(parseGuess('0'), 0);
});
test('parseGuess rejects junk', () => {
  for (const bad of ['', '  ', 'abc', '-5', '1e3', '1.2.3', '12kcal', null, undefined]) eq(parseGuess(bad), null, JSON.stringify(bad));
});

/* ---------- higher/lower ---------- */
test('gapOf', () => {
  eq(gapOf(50, 100), 0.5); eq(gapOf(100, 50), 0.5); eq(gapOf(0, 10), 1); eq(gapOf(0, 0), 0);
});
test('bands cover all streaks and narrow', () => {
  for (let s = 0; s < 40; s++) ok(bandFor(s), `no band for ${s}`);
  for (let i = 1; i < BANDS.length; i++) ok(BANDS[i].hi <= BANDS[i - 1].lo + 1e-9, 'bands overlap upward');
  eq(bandFor(0).lo, 0.6); eq(bandFor(20).hi, 0.15);
});
test('pickNext: never ties, never self, respects recent window (5000 trials)', () => {
  const rng = makeRng(42);
  const nutrientKeys = Object.keys(NUTRIENTS);
  for (let t = 0; t < 5000; t++) {
    const streak = Math.floor(rng() * 25);
    const nutrient = nutrientKeys[Math.floor(rng() * nutrientKeys.length)];
    const current = foods[Math.floor(rng() * foods.length)];
    const history = Array.from({ length: 6 }, () => foods[Math.floor(rng() * foods.length)].id);
    history.push(current.id);
    const next = pickNext({ foods, nutrient, streak, current, history, rng });
    ok(next.id !== current.id, 'picked same food');
    ok(next.nutrients[nutrient] !== current.nutrients[nutrient], `tie on ${nutrient}: ${current.id} vs ${next.id}`);
    ok(!history.slice(-10).includes(next.id), `repeated recent ${next.id}`);
  }
});
test('pickNext: early rounds mostly land in the obvious band', () => {
  const rng = makeRng(7);
  let inBand = 0;
  const N = 500;
  for (let t = 0; t < N; t++) {
    const current = foods[Math.floor(rng() * foods.length)];
    const n = pickNext({ foods, nutrient: 'calories', streak: 0, current, history: [current.id], rng });
    if (gapOf(current.nutrients.calories, n.nutrients.calories) >= 0.6) inBand++;
  }
  ok(inBand / N > 0.8, `only ${(inBand / N * 100).toFixed(0)}% in band`);
});
test('pickNext: late rounds are closer than early rounds on average', () => {
  const rng = makeRng(9);
  const avg = (streak) => {
    let sum = 0; const N = 400;
    for (let t = 0; t < N; t++) {
      const current = foods[Math.floor(rng() * foods.length)];
      const n = pickNext({ foods, nutrient: 'calories', streak, current, history: [current.id], rng });
      sum += gapOf(current.nutrients.calories, n.nutrients.calories);
    }
    return sum / N;
  };
  ok(avg(0) > avg(20) + 0.2, 'difficulty does not ramp');
});
test('pickPair: two different foods, never tied, any side can be higher (3000 trials)', () => {
  const rng = makeRng(21);
  const keys = Object.keys(NUTRIENTS);
  let leftHigher = 0;
  for (let t = 0; t < 3000; t++) {
    const nutrient = keys[Math.floor(rng() * keys.length)];
    const streak = Math.floor(rng() * 25);
    const history = Array.from({ length: 8 }, () => foods[Math.floor(rng() * foods.length)].id);
    const [l, r] = pickPair({ foods, nutrient, streak, history, rng });
    ok(l.id !== r.id, 'same food twice');
    ok(l.nutrients[nutrient] !== r.nutrients[nutrient], `tie on ${nutrient}: ${l.id} vs ${r.id}`);
    if (l.nutrients[nutrient] > r.nutrients[nutrient]) leftHigher++;
  }
  ok(leftHigher > 1200 && leftHigher < 1800, `sides not shuffled fairly (${leftHigher}/3000 left higher)`);
});
test('pickPair: early pairs are far apart, late pairs are close', () => {
  const rng = makeRng(33);
  const avg = (streak) => {
    let sum = 0; const N = 400;
    for (let t = 0; t < N; t++) {
      const [l, r] = pickPair({ foods, nutrient: 'calories', streak, history: [], rng });
      sum += gapOf(l.nutrients.calories, r.nutrients.calories);
    }
    return sum / N;
  };
  ok(avg(0) > avg(20) + 0.2, 'difficulty does not ramp');
});
test('pickPair works in every single-cuisine pool', () => {
  const rng = makeRng(5);
  for (const c of CUISINES.filter((x) => x.id !== 'everyday')) {
    const pool = foods.filter((f) => f.cuisine === c.id);
    for (let t = 0; t < 500; t++) {
      const nutrient = Object.keys(NUTRIENTS)[Math.floor(rng() * 10)];
      const [l, r] = pickPair({ foods: pool, nutrient, streak: Math.floor(rng() * 20), history: [], rng });
      ok(l.cuisine === c.id && r.cuisine === c.id && l.id !== r.id && l.nutrients[nutrient] !== r.nutrients[nutrient], c.id);
    }
  }
});
test('pickNutrient avoids repeats when several are enabled', () => {
  const rng = makeRng(1);
  for (let i = 0; i < 200; i++) ok(pickNutrient(['a', 'b', 'c'], 'a', rng) !== 'a');
  eq(pickNutrient(['a'], 'a', rng), 'a');
});

/* ---------- guess rounds ---------- */
test('buildRounds: 5 distinct foods, non-zero answers', () => {
  const rng = makeRng(3);
  const all = Object.keys(NUTRIENTS);
  for (let t = 0; t < 200; t++) {
    const rounds = buildRounds({ foods, nutrients: all, rng });
    eq(rounds.length, 5);
    eq(new Set(rounds.map((r) => r.food.id)).size, 5);
    for (const r of rounds) ok(r.food.nutrients[r.nutrient] > 0);
  }
});
test('buildRounds works with a single nutrient', () => {
  eq(buildRounds({ foods, nutrients: ['calories'], rng: makeRng(5) }).length, 5);
});

/* ---------- formatting & facts ---------- */
test('formatNumber rounds per nutrient', () => {
  eq(formatNumber('calories', 104.6), '105'); eq(formatNumber('sugar', 14), '14'); eq(formatNumber('protein', 1.26), '1.3');
  eq(formatNumber('sodium', 1750), '1,750');
});
test('factFor fallback order', () => {
  const base = { name: 'X', serving: { label: '1 x' }, nutrients: { sugar: 3 } };
  ok(factFor({ ...base, facts: { sugar: 'S' }, genericFact: 'G' }, 'sugar') === 'S');
  ok(factFor({ ...base, genericFact: 'G' }, 'sugar') === 'G');
  ok(factFor(base, 'sugar').includes('3 g'));
});

/* ---------- data validation ---------- */
test(`dataset has 60+ foods (got ${foods.length})`, () => ok(foods.length >= 60));
test('every food passes schema validation', () => {
  const raw = await_raw;
  const bad = raw.map((f) => [f?.id, validateFood(f)]).filter(([, p]) => p.length);
  ok(!bad.length, bad.map(([id, p]) => `${id}: ${p.join(', ')}`).join(' | '));
});
test('ids are unique', () => eq(new Set(foods.map((f) => f.id)).size, foods.length));
test('no food has all-equal nutrients (sanity)', () => {
  for (const f of foods) ok(new Set(Object.values(f.nutrients)).size > 1, f.id);
});
test('every nutrient has enough non-zero foods to play (>= 20)', () => {
  for (const n of Object.keys(NUTRIENTS)) ok(foods.filter((f) => f.nutrients[n] > 0).length >= 20, n);
});
test('every nutrient has at least one pair in the "obvious" band', () => {
  for (const n of Object.keys(NUTRIENTS)) {
    const vals = foods.map((f) => f.nutrients[n]);
    ok(vals.some((a) => vals.some((b) => gapOf(a, b) >= 0.6)), n);
  }
});

/* ---------- trouble-spot stats & learn links ---------- */
test('weakest: ranks by miss rate, needs MIN_ASKED rounds and at least one miss', () => {
  const stats = {
    sodium: { asked: 10, missed: 5 }, // 50%
    fat: { asked: 4, missed: 3 }, // 75%
    sugar: { asked: 2, missed: 2 }, // too few rounds
    protein: { asked: 8, missed: 0 }, // never missed
    iron: { asked: 6, missed: 3 }, // 50%, fewer rounds than sodium
    bogus: { asked: 9, missed: 9 }, // unknown nutrient
  };
  const w = weakest(stats, 5).map((x) => x.nutrient);
  eq(w.join(), 'fat,sodium,iron');
  eq(weakest(stats, 1).length, 1);
  eq(MIN_ASKED, 3);
});
test('weakest: empty / missing stats are safe', () => {
  eq(weakest({}).length, 0); eq(weakest(undefined).length, 0); eq(weakest(null).length, 0);
});
test('totalAsked and countBy', () => {
  eq(totalAsked({ a: { asked: 3 }, b: { asked: 4 } }), 7); eq(totalAsked(undefined), 0);
  const c = countBy(['fat', 'sodium', 'fat']); eq(c.fat, 2); eq(c.sodium, 1); eq(Object.keys(countBy()).length, 0);
});
test('every nutrient has a learn tip and an https link on a trusted source', () => {
  const trusted = ['nutritionsource.hsph.harvard.edu', 'www.nhs.uk'];
  for (const [key, n] of Object.entries(NUTRIENTS)) {
    ok(n.learn, `${key}: no learn`);
    ok(n.learn.tip.length > 40 && n.learn.title && n.learn.source, `${key}: incomplete learn`);
    const u = new URL(n.learn.url);
    ok(u.protocol === 'https:', `${key}: not https`);
    ok(trusted.includes(u.hostname), `${key}: ${u.hostname} not in trusted list`);
    ok(!u.search && !u.hash, `${key}: link should carry no query or fragment`);
  }
});

/* ---------- cuisines, flags & cooking swaps ---------- */
test('every cuisine except "everyday" has 10+ dishes', () => {
  for (const c of CUISINES.filter((x) => x.id !== 'everyday')) {
    const n = dishes.filter((f) => f.cuisine === c.id).length;
    ok(n >= 10, `${c.id} has only ${n}`);
  }
});
test('every cuisine pool is playable for every nutrient (8+ non-zero values)', () => {
  for (const c of CUISINES) {
    const pool = foods.filter((f) => cuisineOf(f) === c.id);
    for (const n of Object.keys(NUTRIENTS)) {
      ok(pool.filter((f) => f.nutrients[n] > 0).length >= 8, `${c.id}/${n}`);
    }
  }
});
test('cuisineOf defaults to everyday', () => {
  eq(cuisineOf({ nutrients: {} }), 'everyday'); eq(cuisineOf({ cuisine: 'indian' }), 'indian');
});
test('flagsFor uses the HIGH thresholds (inclusive)', () => {
  const mk = (n) => ({ nutrients: { fat: 0, carbs: 0, sodium: 0, sugar: 0, ...n } });
  eq(flagsFor(mk({ fat: HIGH.fat.min })).join(), 'fat');
  eq(flagsFor(mk({ fat: HIGH.fat.min - 0.1 })).length, 0);
  eq(flagsFor(mk({ carbs: 70, sodium: 900 })).join(), 'carbs,sodium');
});
test('swapsFor only returns tips for nutrients the dish is actually high in', () => {
  const f = { nutrients: { fat: 30, carbs: 10, sodium: 0, sugar: 0 }, swaps: [{ nutrient: 'fat', tip: 'a' }, { nutrient: 'carbs', tip: 'b' }, { nutrient: 'fat', tip: '' }] };
  eq(swapsFor(f).length, 1); eq(swapsFor(f)[0].tip, 'a');
  eq(swapsFor({ nutrients: { fat: 30, carbs: 0, sodium: 0, sugar: 0 } }).length, 0);
});
test('every food that is high in a nutrient has a swap tip for it', () => {
  const missing = [];
  for (const f of foods) {
    const have = new Set((f.swaps ?? []).filter((s) => s.tip).map((s) => s.nutrient));
    for (const n of flagsFor(f)) if (!have.has(n)) missing.push(`${f.id}:${n}`);
  }
  ok(!missing.length, missing.join(', '));
});
test('swap entries use valid nutrients and non-empty tips', () => {
  for (const f of foods) for (const s of f.swaps ?? []) {
    ok(HIGH[s.nutrient], `${f.id}: "${s.nutrient}" is not a swappable nutrient`);
    ok(typeof s.tip === 'string' && s.tip.length > 20, `${f.id}: tip too short`);
  }
});
test('every swap tip has ingredient swaps (from -> to)', () => {
  const missing = [];
  for (const f of foods) for (const s of f.swaps ?? []) {
    const ing = s.ingredients;
    if (!ing?.length) { missing.push(`${f.id}:${s.nutrient}`); continue; }
    for (const i of ing) if (!i.from?.trim() || !i.to?.trim() || i.from === i.to) missing.push(`${f.id}:${s.nutrient} bad pair`);
  }
  ok(!missing.length, missing.join(', '));
});
test('ingredient-swaps.json has no orphans (every id/nutrient matches a dish swap tip)', () => {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const orphans = [];
  for (const [id, byNutrient] of Object.entries(swapMap)) {
    const f = byId.get(id);
    if (!f) { orphans.push(`${id} (no such dish)`); continue; }
    for (const n of Object.keys(byNutrient)) {
      if (!(f.swaps ?? []).some((s) => s.nutrient === n)) orphans.push(`${id}:${n}`);
    }
  }
  ok(!orphans.length, orphans.join(', '));
});
test('dishes have a genericFact and a known cuisine', () => {
  for (const f of dishes) {
    ok(f.genericFact, `${f.id} missing fact`);
    ok(CUISINES.some((c) => c.id === f.cuisine), `${f.id} cuisine`);
  }
});
test('validateFood rejects an unknown cuisine', () => {
  const bad = { ...foods[0], cuisine: 'martian' };
  ok(validateFood(bad).some((p) => p.includes('cuisine')));
});
test('pickNext works inside a single-cuisine pool (small pool, 2000 trials)', () => {
  const rng = makeRng(11);
  for (const c of CUISINES.filter((x) => x.id !== 'everyday')) {
    const pool = foods.filter((f) => f.cuisine === c.id);
    for (let t = 0; t < 2000; t++) {
      const nutrient = Object.keys(NUTRIENTS)[Math.floor(rng() * 10)];
      const current = pool[Math.floor(rng() * pool.length)];
      const next = pickNext({ foods: pool, nutrient, streak: Math.floor(rng() * 20), current, history: [current.id], rng });
      ok(next.id !== current.id && next.cuisine === c.id, `${c.id} bad pick`);
      ok(next.nutrients[nutrient] !== current.nutrients[nutrient], `${c.id} tie on ${nutrient}`);
    }
  }
});

// Calorie plausibility: kcal vs 4*protein + 4*carbs + 9*fat. Warn only (alcohol, rounding).
for (const f of foods) {
  const est = 4 * f.nutrients.protein + 4 * f.nutrients.carbs + 9 * f.nutrients.fat;
  const diff = Math.abs(est - f.nutrients.calories);
  if (diff > 15 && diff / Math.max(f.nutrients.calories, 1) > 0.25 && !f.tags?.includes('alcohol')) {
    warn(`${f.id}: calories ${f.nutrients.calories} vs macro estimate ${est.toFixed(0)}`);
  }
}

const summary = document.getElementById('summary');
summary.textContent = `${passed} passed, ${failed} failed`;
summary.className = failed ? 'fail' : 'pass';
document.title = failed ? `FAIL (${failed})` : `PASS (${passed})`;
