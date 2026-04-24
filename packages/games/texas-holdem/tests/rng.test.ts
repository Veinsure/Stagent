import { describe, it, expect } from "vitest"
import { createRng } from "../src/rng.js"

describe("rng", () => {
  it("same seed produces same sequence", () => {
    const r1 = createRng("abc")
    const r2 = createRng("abc")
    const s1 = [r1.next(), r1.next(), r1.next()]
    const s2 = [r2.next(), r2.next(), r2.next()]
    expect(s1).toEqual(s2)
  })

  it("different seeds produce different sequences", () => {
    const r1 = createRng("abc")
    const r2 = createRng("xyz")
    expect(r1.next()).not.toBe(r2.next())
  })

  it("can serialize state and resume", () => {
    const r1 = createRng("seed")
    r1.next()
    r1.next()
    const state = r1.snapshot()
    const r2 = createRng("seed", state)
    expect(r2.next()).toBe(r1.next())
  })
})
