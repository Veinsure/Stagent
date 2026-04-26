import { describe, it, expect } from "vitest"
import { buildPersonaRegistry } from "../../src/house-bot/persona/index.js"
import { CostGuard, RATES } from "../../src/house-bot/cost-guard.js"

describe("buildPersonaRegistry", () => {
  const g = new CostGuard({ budgetUsd: 1, rates: RATES })

  it("always includes random", () => {
    const r = buildPersonaRegistry({ costGuard: g })
    expect(r["random"]).toBeDefined()
    expect(r["random"]!.name).toBe("random")
  })

  it("loads claude-tight only when anthropicKey present", () => {
    expect(buildPersonaRegistry({ costGuard: g })["claude-tight"]).toBeUndefined()
    const r = buildPersonaRegistry({ costGuard: g, anthropicKey: "k" })
    expect(r["claude-tight"]).toBeDefined()
    expect(r["claude-tight"]!.name).toBe("claude-tight")
  })

  it("loads gpt-aggro only when openaiKey present", () => {
    expect(buildPersonaRegistry({ costGuard: g })["gpt-aggro"]).toBeUndefined()
    const r = buildPersonaRegistry({ costGuard: g, openaiKey: "k" })
    expect(r["gpt-aggro"]).toBeDefined()
    expect(r["gpt-aggro"]!.name).toBe("gpt-aggro")
  })

  it("loads all three when both keys present", () => {
    const r = buildPersonaRegistry({ costGuard: g, anthropicKey: "a", openaiKey: "o" })
    expect(Object.keys(r).sort()).toEqual(["claude-tight", "gpt-aggro", "random"])
  })
})
