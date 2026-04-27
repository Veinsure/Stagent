import { describe, it, expect } from "vitest"
import { decideRandom } from "../src/random-bot.js"
import type { LegalAction } from "@stagent/texas-holdem"

describe("RandomBot", () => {
  it("picks from legal actions", () => {
    const legal: LegalAction[] = [{ kind: "fold" }, { kind: "call" }]
    for (let i = 0; i < 100; i++) {
      const { action } = decideRandom(legal, () => Math.random())
      expect(["fold", "call"]).toContain(action.kind)
    }
  })

  it("raise picks amount in [min, max]", () => {
    const legal: LegalAction[] = [{ kind: "raise", min: 20, max: 200 }]
    for (let i = 0; i < 50; i++) {
      const { action } = decideRandom(legal, () => 0.5)
      const a = action as { kind: "raise"; amount: number }
      expect(a.kind).toBe("raise")
      expect(a.amount).toBeGreaterThanOrEqual(20)
      expect(a.amount).toBeLessThanOrEqual(200)
    }
  })

  it("throws when no legal actions", () => {
    expect(() => decideRandom([], () => 0)).toThrow()
  })
})
