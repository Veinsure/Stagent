import { describe, it, expect } from "vitest"
import { legalActions } from "../src/legal-actions.js"
import { createTable } from "../src/state-init.js"

const s = createTable({
  seats: [
    { agent_id: "a1", chips: 1000 },
    { agent_id: "a2", chips: 1000 },
    { agent_id: "a3", chips: 1000 },
  ],
  rng_seed: "x",
  blinds: { sb: 5, bb: 10 },
})

describe("legalActions", () => {
  it("returns [] if not your turn", () => {
    expect(legalActions(s, "a2")).toEqual([])
  })

  it("returns fold/call/raise/all_in preflop with bet outstanding", () => {
    const acts = legalActions(s, "a1").map((a) => a.kind)
    expect(acts).toContain("fold")
    expect(acts).toContain("call")
    expect(acts).toContain("raise")
    expect(acts).toContain("all_in")
    expect(acts).not.toContain("check")
  })

  it("raise has min/max bounds", () => {
    const raise = legalActions(s, "a1").find((a) => a.kind === "raise") as
      | { kind: "raise"; min: number; max: number }
      | undefined
    expect(raise).toBeDefined()
    expect(raise!.min).toBe(20)            // current_bet 10 + min_raise 10
    expect(raise!.max).toBe(1000)          // a1 has 1000 chips
  })
})
