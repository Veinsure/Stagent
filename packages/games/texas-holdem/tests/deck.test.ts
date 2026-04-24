import { describe, it, expect } from "vitest"
import { freshDeck, shuffle, drawN } from "../src/deck.js"
import { createRng } from "../src/rng.js"

describe("deck", () => {
  it("freshDeck has 52 unique cards", () => {
    expect(freshDeck()).toHaveLength(52)
  })

  it("shuffle is deterministic with seed", () => {
    const a = shuffle(freshDeck(), createRng("s1"))
    const b = shuffle(freshDeck(), createRng("s1"))
    expect(a).toEqual(b)
  })

  it("shuffle changes order", () => {
    const orig = freshDeck()
    const shuffled = shuffle(freshDeck(), createRng("s1"))
    expect(shuffled).not.toEqual(orig)
  })

  it("drawN removes from top, returns drawn", () => {
    const deck = freshDeck()
    const { drawn, rest } = drawN(deck, 5)
    expect(drawn).toHaveLength(5)
    expect(rest).toHaveLength(47)
    expect(drawn[0]).toEqual(deck[0])
  })
})
