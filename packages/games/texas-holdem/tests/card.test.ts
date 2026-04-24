import { describe, it, expect } from "vitest"
import { allCards, cardToString, parseCard, compareRank } from "../src/card.js"

describe("card", () => {
  it("allCards returns 52 unique cards", () => {
    const cards = allCards()
    expect(cards).toHaveLength(52)
    expect(new Set(cards.map(cardToString))).toHaveProperty("size", 52)
  })

  it("cardToString uses rank+suit notation", () => {
    expect(cardToString({ rank: "A", suit: "s" })).toBe("As")
    expect(cardToString({ rank: "T", suit: "h" })).toBe("Th")
    expect(cardToString({ rank: "2", suit: "c" })).toBe("2c")
  })

  it("parseCard inverse of cardToString", () => {
    expect(parseCard("Ks")).toEqual({ rank: "K", suit: "s" })
    expect(parseCard("9d")).toEqual({ rank: "9", suit: "d" })
  })

  it("compareRank: A>K>...>2", () => {
    expect(compareRank("A", "K")).toBeGreaterThan(0)
    expect(compareRank("2", "3")).toBeLessThan(0)
    expect(compareRank("T", "T")).toBe(0)
  })
})
