// Deterministic per-day seed, so a player gets the same puzzle all day.
// No server here, so "today" is the player's own device clock (local date,
// not UTC) — the puzzle changes at their local midnight, which is what a
// client-only game can promise without a backend.
export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Small deterministic string hash (FNV-1a) so (date, mode) always maps to
// the same 32-bit seed for makeRng() — different modes get different
// puzzles even on the same day.
export function dailySeed(mode) {
  const str = `${todayKey()}:${mode}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
