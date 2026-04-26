import { describe, it, expect } from "vitest"
import { CostGuard, RATES } from "../../src/house-bot/cost-guard.js"

describe("CostGuard", () => {
  it("accumulates within budget, trips over", () => {
    const g = new CostGuard({ budgetUsd: 1.0, rates: RATES })
    // claude-tight $15/K in + $75/K out → 1000/1000 = $0.015 + $0.075 = $0.09
    const a = g.charge("claude-tight", { input_tokens: 1000, output_tokens: 1000 })
    expect(a.allow).toBe(true)
    expect(a.spent_usd).toBeCloseTo(0.09, 3)
    for (let i = 0; i < 20; i++) g.charge("claude-tight", { input_tokens: 1000, output_tokens: 1000 })
    const after = g.charge("claude-tight", { input_tokens: 1, output_tokens: 1 })
    expect(after.allow).toBe(false)
  })

  it("persona budgets are independent", () => {
    const g = new CostGuard({ budgetUsd: 0.05, rates: RATES })
    const a1 = g.charge("claude-tight", { input_tokens: 10_000, output_tokens: 10_000 })
    expect(a1.allow).toBe(false)
    const a2 = g.charge("gpt-aggro", { input_tokens: 100, output_tokens: 100 })
    expect(a2.allow).toBe(true)
  })

  it("unknown persona defaults to $0 cost (safe no-op)", () => {
    const g = new CostGuard({ budgetUsd: 1.0, rates: RATES })
    const a = g.charge("random", { input_tokens: 1, output_tokens: 1 })
    expect(a.spent_usd).toBe(0)
    expect(a.allow).toBe(true)
  })

  it("isOverBudget reflects latest charge", () => {
    const g = new CostGuard({ budgetUsd: 0.05, rates: RATES })
    expect(g.isOverBudget("claude-tight")).toBe(false)
    g.charge("claude-tight", { input_tokens: 10_000, output_tokens: 10_000 })
    expect(g.isOverBudget("claude-tight")).toBe(true)
  })

  it("snapshot returns current cumulative spend", () => {
    const g = new CostGuard({ budgetUsd: 10, rates: RATES })
    g.charge("claude-tight", { input_tokens: 1000, output_tokens: 1000 })
    g.charge("gpt-aggro", { input_tokens: 1000, output_tokens: 1000 })
    const snap = g.snapshot()
    expect(snap["claude-tight"]).toBeCloseTo(0.09, 3)
    expect(snap["gpt-aggro"]).toBeCloseTo(0.025, 3)
  })
})
