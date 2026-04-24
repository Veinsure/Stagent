import { describe, it, expect } from "vitest"
import { resolveShowdown } from "../src/showdown.js"
import type { TexasHoldemState } from "../src/types.js"
import { parseCard } from "../src/card.js"

const baseState = (): TexasHoldemState => ({
  seats: [
    {
      index: 0, agent_id: "a1", chips: 0,
      hole_cards: [parseCard("As"), parseCard("Ah")],
      contributed_this_street: 0, contributed_total: 100, status: "active",
      has_acted_this_street: true,
    },
    {
      index: 1, agent_id: "a2", chips: 0,
      hole_cards: [parseCard("2c"), parseCard("7d")],
      contributed_this_street: 0, contributed_total: 100, status: "active",
      has_acted_this_street: true,
    },
  ],
  button: 0, street: "river", board: ["Kh", "5d", "2s", "9c", "Tc"].map(parseCard),
  pot_main: 200, pots: [], current_bet: 0, min_raise: 10, to_act: null,
  blinds: { sb: 5, bb: 10 }, hand_no: 1, rng_seed: "x", rng_state: "0",
  deck_remaining: [], history: [],
})

describe("resolveShowdown", () => {
  it("higher pair wins whole pot", () => {
    const s = baseState()
    const winners = resolveShowdown(s)
    expect(winners).toEqual([{ agent_id: "a1", won: 200 }])
  })

  it("fold-to-one player gives pot to remaining player", () => {
    const s = baseState()
    s.seats[1]!.status = "folded"
    const winners = resolveShowdown(s)
    expect(winners).toEqual([{ agent_id: "a1", won: 200 }])
  })

  it("split pot when hands tie", () => {
    const s = baseState()
    s.seats[1]!.hole_cards = [parseCard("Ad"), parseCard("Ac")]
    s.board = ["2h", "5d", "9s", "Jc", "Qc"].map(parseCard)
    const winners = resolveShowdown(s)
    // Both have AA + same kickers from board
    expect(winners).toHaveLength(2)
    expect(winners[0]!.won + winners[1]!.won).toBe(200)
  })
})

describe("resolveShowdown side pots", () => {
  it("all-in short stack wins only main pot, not side", () => {
    const s = baseState()
    // 3 players, contributions: a1=50 all-in, a2=200, a3=200
    s.seats.push({
      index: 2, agent_id: "a3", chips: 0,
      hole_cards: [parseCard("Kc"), parseCard("Kd")],
      contributed_this_street: 0, contributed_total: 200, status: "active",
      has_acted_this_street: true,
    })
    s.seats[0]!.contributed_total = 50
    s.seats[0]!.status = "all_in"
    s.seats[0]!.hole_cards = [parseCard("As"), parseCard("Ah")]    // best
    s.seats[1]!.contributed_total = 200
    s.seats[1]!.hole_cards = [parseCard("2c"), parseCard("7d")]    // worst
    s.pot_main = 50 + 200 + 200       // 450 total
    s.board = ["3h", "5d", "9s", "Jc", "Qc"].map(parseCard)

    const winners = resolveShowdown(s)
    // Main pot = 50 * 3 = 150 → a1 wins (best hand)
    // Side pot = 150 * 2 = 300 → between a2 and a3 → a3 (KK) wins
    const a1 = winners.find((w) => w.agent_id === "a1")!
    const a3 = winners.find((w) => w.agent_id === "a3")!
    expect(a1.won).toBe(150)
    expect(a3.won).toBe(300)
  })
})
