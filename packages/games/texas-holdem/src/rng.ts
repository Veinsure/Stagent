function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

export interface Rng {
  /** Returns a uniform float in [0, 1). */
  next(): number
  /** Serialize current state for resume. */
  snapshot(): string
}

export function createRng(seed: string, resumeState?: string): Rng {
  let state = resumeState ? Number(resumeState) >>> 0 : hashSeed(seed)
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
    snapshot() {
      return String(state)
    },
  }
}
