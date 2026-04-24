import { describe, it, expect } from "vitest"
import { TexasHoldemModule as M } from "../../src/index.js"

describe("fixture: full hand all-call to showdown", () => {
  it("3 players check down, pot is distributed", () => {
    let s = M.createTable({
      seats: [
        { agent_id: "a1", chips: 1000 },
        { agent_id: "a2", chips: 1000 },
        { agent_id: "a3", chips: 1000 },
      ],
      rng_seed: "fixture-1",
      blinds: { sb: 5, bb: 10 },
    })

    s = M.applyAction(s, { kind: "call" }, "a1").state
    s = M.applyAction(s, { kind: "call" }, "a2").state
    s = M.applyAction(s, { kind: "check" }, "a3").state
    expect(s.street).toBe("flop")

    for (const a of ["a2", "a3", "a1"] as const) s = M.applyAction(s, { kind: "check" }, a).state
    expect(s.street).toBe("turn")
    for (const a of ["a2", "a3", "a1"] as const) s = M.applyAction(s, { kind: "check" }, a).state
    expect(s.street).toBe("river")
    for (const a of ["a2", "a3", "a1"] as const) s = M.applyAction(s, { kind: "check" }, a).state
    expect(s.street).toBe("showdown")
    expect(s.pot_main).toBe(0)

    const totalChips = s.seats.reduce((a, b) => a + b.chips, 0)
    expect(totalChips).toBe(3000)         // chips conserved
  })
})
