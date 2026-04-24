import { describe, it, expect } from "vitest"
import { TexasHoldemModule as M } from "../../src/index.js"

describe("fixture: heads-up", () => {
  it("2 players, button posts SB and acts first preflop", () => {
    let s = M.createTable({
      seats: [
        { agent_id: "btn", chips: 1000 },
        { agent_id: "bb", chips: 1000 },
      ],
      rng_seed: "fixture-hu",
      blinds: { sb: 5, bb: 10 },
    })
    // In heads-up, button = SB and acts first preflop
    expect(s.to_act).toBe(0)
    s = M.applyAction(s, { kind: "call" }, "btn").state           // SB completes
    s = M.applyAction(s, { kind: "check" }, "bb").state           // BB checks
    expect(s.street).toBe("flop")
    // post-flop, BB acts first
    expect(s.to_act).toBe(1)
  })
})
