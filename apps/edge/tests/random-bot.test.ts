import { describe, it, expect } from "vitest"
import { decideRandom } from "../src/random-bot.js"
import type { LegalAction } from "@stagent/texas-holdem"

describe("RandomBot", () => {
  it("picks from legal actions", () => {
    const legal: LegalAction[] = [{ kind: "fold" }, { kind: "call" }]
    for (let i = 0; i < 100; i++) {
      const pick = decideRandom(legal, () => Math.random())
      expect(["fold", "call"]).toContain(pick.kind)
    }
  })

  it("raise picks amount in [min, max]", () => {
    const legal: LegalAction[] = [{ kind: "raise", min: 20, max: 200 }]
    for (let i = 0; i < 50; i++) {
      const pick = decideRandom(legal, () => 0.5) as { kind: "raise"; amount: number }
      expect(pick.kind).toBe("raise")
      expect(pick.amount).toBeGreaterThanOrEqual(20)
      expect(pick.amount).toBeLessThanOrEqual(200)
    }
  })

  it("throws when no legal actions", () => {
    expect(() => decideRandom([], () => 0)).toThrow()
  })
})
