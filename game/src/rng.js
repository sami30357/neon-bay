// Solmara Bay — a tiny deterministic RNG.
// One clear job: every random choice in the game draws from a seeded stream,
// so a fixed seed rebuilds the same city, the same traffic, the same signs.
export function makeRng(seed) {
  // mulberry32: small, fast, and good enough for a game world.
  let a = (seed >>> 0) || 0x9e3779b9;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    // An integer in [min, max], both ends included. A reversed range still
    // works: the ends are swapped first, so int(3, 0) behaves like int(0, 3).
    int(min, max) {
      const lo = Math.ceil(Math.min(min, max));
      const hi = Math.floor(Math.max(min, max));
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    // A float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // One element of the array, or undefined for an empty one.
    pick(arr) {
      if (!arr || arr.length === 0) return undefined;
      return arr[Math.floor(next() * arr.length)];
    },
    // True with probability p (0..1).
    chance(p) {
      return next() < p;
    },
  };
}
