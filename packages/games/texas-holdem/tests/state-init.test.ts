import { describe, it, expect } from "vitest"
import { createTable } from "../src/state-init.js"

const opts = {
  seats: [
    { agent_id: "a1", chips: 1000 },
    { agent_id: "a2", chips: 1000 },
    { agent_id: "a3", chips: 1000 },
  ],
  rng_seed: "test-1",
  blinds: { sb: 5, bb: 10 },
}

describe("createTable", () => {
  it("seats all agents with chips", () => {
    const s = createTable(opts)
    expect(s.seats).toHaveLength(3)
    expect(s.seats.map((x) => x.agent_id)).toEqual(["a1", "a2", "a3"])
  })

  it("starts at preflop", () => {
    expect(createTable(opts).street).toBe("preflop")
  })

  it("posts blinds: SB and BB chips deducted", () => {
    const s = createTable(opts)
    // button = 0, SB = 1, BB = 2
    expect(s.seats[1]!.chips).toBe(995)         // 1000 - 5
    expect(s.seats[2]!.chips).toBe(990)         // 1000 - 10
    expect(s.pot_main).toBe(15)
    expect(s.current_bet).toBe(10)
  })

  it("deals 2 hole cards per seat", () => {
    const s = createTable(opts)
    expect(s.seats[0]!.hole_cards).toHaveLength(2)
    expect(s.seats[2]!.hole_cards).toHaveLength(2)
  })

  it("first to act preflop is UTG (button + 3 in 3-handed = button + 0 wraparound, but BB+1)", () => {
    const s = createTable(opts)
    // 3-handed: button=0, SB=1, BB=2, UTG=0 (button)
    expect(s.to_act).toBe(0)
  })

  it("deterministic with same seed", () => {
    const a = createTable(opts)
    const b = createTable(opts)
    expect(a.seats[0]!.hole_cards).toEqual(b.seats[0]!.hole_cards)
  })
})
