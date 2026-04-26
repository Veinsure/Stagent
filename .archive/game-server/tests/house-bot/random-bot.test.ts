import { describe, it, expect } from "vitest"
import { RandomBot } from "../../src/house-bot/persona/random.js"
import type { TurnContext, LegalAction } from "../../src/house-bot/persona/types.js"

function ctx(legal: LegalAction[], overrides: Partial<TurnContext> = {}): TurnContext {
  return {
    state: {} as any,
    legal_actions: legal,
    time_budget_ms: 30_000,
    hand_no: 1,
    my_stack: 1000,
    pot: 20,
    to_call: 10,
    ...overrides,
  }
}

describe("RandomBot", () => {
  const ac = new AbortController()

  it("always returns a kind present in legal_actions (1000 runs)", async () => {
    const legal: LegalAction[] = [
      { kind: "fold" },
      { kind: "call" },
      { kind: "raise", min: 20, max: 200 },
    ]
    const kinds = new Set(legal.map((l) => l.kind))
    for (let i = 0; i < 1000; i++) {
      const d = await RandomBot.decide(ctx(legal), ac.signal)
      expect(kinds.has(d.action.kind)).toBe(true)
    }
  })

  it("raise amount always within [min,max]", async () => {
    const legal: LegalAction[] = [{ kind: "raise", min: 20, max: 200 }]
    for (let i = 0; i < 200; i++) {
      const d = await RandomBot.decide(ctx(legal), ac.signal)
      if (d.action.kind === "raise") {
        expect(d.action.amount).toBeGreaterThanOrEqual(20)
        expect(d.action.amount).toBeLessThanOrEqual(200)
      }
    }
  })

  it("does not emit think/say (cheap baseline)", async () => {
    const legal: LegalAction[] = [{ kind: "check" }, { kind: "fold" }]
    const d = await RandomBot.decide(ctx(legal), ac.signal)
    expect(d.think).toBeUndefined()
    expect(d.say).toBeUndefined()
  })

  it("empty legal_actions → fold (safe fallback)", async () => {
    const d = await RandomBot.decide(ctx([]), ac.signal)
    expect(d.action.kind).toBe("fold")
  })
})
