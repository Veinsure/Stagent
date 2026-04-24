import { describe, it, expect } from "vitest"
import { applyAction } from "../src/apply-action.js"
import { createTable } from "../src/state-init.js"

const newState = () =>
  createTable({
    seats: [
      { agent_id: "a1", chips: 1000 },
      { agent_id: "a2", chips: 1000 },
      { agent_id: "a3", chips: 1000 },
    ],
    rng_seed: "test-street",
    blinds: { sb: 5, bb: 10 },
  })

describe("street transitions", () => {
  it("preflop → flop after all call/check", () => {
    let s = newState()
    s = applyAction(s, { kind: "call" }, "a1").state          // a1 calls 10
    s = applyAction(s, { kind: "call" }, "a2").state          // a2 (SB) calls 5 more
    s = applyAction(s, { kind: "check" }, "a3").state         // a3 (BB) checks
    expect(s.street).toBe("flop")
    expect(s.board).toHaveLength(3)
    expect(s.current_bet).toBe(0)
    expect(s.seats[1]!.contributed_this_street).toBe(0)
  })

  it("flop → turn → river after checks each round", () => {
    let s = newState()
    s = applyAction(s, { kind: "call" }, "a1").state
    s = applyAction(s, { kind: "call" }, "a2").state
    s = applyAction(s, { kind: "check" }, "a3").state
    expect(s.street).toBe("flop")

    // post-flop first to act = SB (a2)
    s = applyAction(s, { kind: "check" }, "a2").state
    s = applyAction(s, { kind: "check" }, "a3").state
    s = applyAction(s, { kind: "check" }, "a1").state
    expect(s.street).toBe("turn")
    expect(s.board).toHaveLength(4)

    s = applyAction(s, { kind: "check" }, "a2").state
    s = applyAction(s, { kind: "check" }, "a3").state
    s = applyAction(s, { kind: "check" }, "a1").state
    expect(s.street).toBe("river")
    expect(s.board).toHaveLength(5)
  })
})
