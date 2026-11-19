// v7: Sun-Kissed Bay — header touch under recording 01a1f27b (file content unchanged).
// v6: Golden Hour Kings — header touch under recording 01a1f269 (file content unchanged).
// v5: Golden Hour — header touch under recording 01a1f255 (day-night cycle build; file content unchanged).
// v3: re-applied under recording 01a1ee33 - v2 content unchanged.
// Seeded random numbers for Neon Bay: the city layout is deterministic, so every
// run (and every screenshot) shows the same streets, buildings and neon signs.
// v2 adds distinct picks, integer ranges and a bell-curve helper so the richer
// city (signs, props, pedestrians, orbs) can draw varied but repeatable values.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) { return min + next() * (max - min); },
    int(min, max) { return Math.floor(min + next() * (max - min + 1)); },
    pick(list) { return list[Math.floor(next() * list.length)]; },
    chance(p) { return next() < p; },
    // N distinct entries from a list, in random order (no repeats).
    pickN(list, n) {
      const copy = list.slice();
      const out = [];
      while (copy.length > 0 && out.length < n) {
        out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]);
      }
      return out;
    },
    // integer in [min, max)
    rangeInt(min, max) { return min + Math.floor(next() * (max - min)); },
    // bell-curve-ish value centred on 0.5 (sum of three draws, clamped)
    bell() { return Math.max(0, Math.min(1, (next() + next() + next()) / 3)); },
    // pick from [value, weight] pairs
    weighted(pairs) {
      let total = 0;
      for (const [, w] of pairs) total += w;
      let roll = next() * total;
      for (const [v, w] of pairs) { roll -= w; if (roll <= 0) return v; }
      return pairs[pairs.length - 1][0];
    },
  };
}

export const CITY_SEED = 1337;
