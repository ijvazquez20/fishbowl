/** Small seeded PRNG (mulberry32) so tests can pin down every roll. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays back a fixed list of rolls, then repeats the last one. */
export function scripted(rolls: number[]): () => number {
  let i = 0;
  return () => rolls[Math.min(i++, rolls.length - 1)];
}
