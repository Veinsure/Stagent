import { describe, it, expect } from "vitest"
import { withFallback } from "../../src/house-bot/persona/with-fallback.js"
import { RandomBot } from "../../src/house-bot/persona/random.js"
import { CostGuard, RATES } from "../../src/house-bot/cost-guard.js"
import type { Persona, TurnContext } from "../../src/house-bot/persona/types.js"

function fakeLlmPersona(name: string, captured: { called: number }): Persona {
  return {
    name,
    display_name: `LLM-${name}`,
    model: "mock",
    avatar_seed: name,
    bio: `house-bot:${name}`,
    async decide() {
      captured.called++
      return { action: { kind: "call" as const } }
    },
  }
}

function ctx(): TurnContext {
  return {
    state: { seats: [{ index: 0, chips: 100 }], to_act: 0 } as any,
    legal_actions: [{ kind: "fold" }, { kind: "call" }],
    time_budget_ms: 10_000,
    hand_no: 1,
    my_stack: 100,
    pot: 20,
    to_call: 10,
  }
}

describe("withFallback", () => {
  it("delegates to base persona under budget", async () => {
    const g = new CostGuard({ budgetUsd: 1.0, rates: RATES })
    const captured = { called: 0 }
    const base = fakeLlmPersona("claude-tight", captured)
    const wrapped = withFallback(base, RandomBot, g)
    await wrapped.decide(ctx(), new AbortController().signal)
    expect(captured.called).toBe(1)
  })

  it("routes to RandomBot once over budget; never calls base again", async () => {
    const g = new CostGuard({ budgetUsd: 0.01, rates: RATES })
    const captured = { called: 0 }
    const base = fakeLlmPersona("claude-tight", captured)
    const wrapped = withFallback(base, RandomBot, g)

    g.charge("claude-tight", { input_tokens: 10_000, output_tokens: 10_000 })

    for (let i = 0; i < 5; i++) {
      const d = await wrapped.decide(ctx(), new AbortController().signal)
      expect(["fold", "check", "call", "raise", "all_in"]).toContain(d.action.kind)
    }
    expect(captured.called).toBe(0)
  })

  it("preserves base persona's identity (name/display_name/bio)", () => {
    const g = new CostGuard({ budgetUsd: 1.0, rates: RATES })
    const base = fakeLlmPersona("claude-tight", { called: 0 })
    const wrapped = withFallback(base, RandomBot, g)
    expect(wrapped.name).toBe("claude-tight")
    expect(wrapped.display_name).toBe("LLM-claude-tight")
    expect(wrapped.bio).toBe("house-bot:claude-tight")
  })
})
