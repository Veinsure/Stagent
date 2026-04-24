import { describe, it, expect } from "vitest"
import { TexasHoldemModule as M } from "../../src/index.js"

describe("fixture: all-in creates side pot", () => {
  it("short stack all-in does not contest side pot", () => {
    let s = M.createTable({
      seats: [
        { agent_id: "short", chips: 50 },
        { agent_id: "mid", chips: 500 },
        { agent_id: "deep", chips: 500 },
      ],
      rng_seed: "fixture-sidepot",
      blinds: { sb: 5, bb: 10 },
    })

    // short shoves preflop, others call
    s = M.applyAction(s, { kind: "all_in" }, "short").state         // 50 in
    s = M.applyAction(s, { kind: "call" }, "mid").state             // matches 50
    s = M.applyAction(s, { kind: "call" }, "deep").state            // matches 50
    expect(s.street).toBe("flop")

    // mid bets, deep calls all the way to showdown
    for (const street of ["flop", "turn", "river"]) {
      s = M.applyAction(s, { kind: "raise", amount: 50 }, "mid").state
      s = M.applyAction(s, { kind: "call" }, "deep").state
      // short is all_in, skipped automatically
    }
    expect(s.street).toBe("showdown")

    const totalChips = s.seats.reduce((a, b) => a + b.chips, 0)
    expect(totalChips).toBe(1050)
  })
})
