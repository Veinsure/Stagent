import { describe, it, expect } from "vitest"
import { createMockAnthropic, createMockOpenAi } from "../../src/house-bot/llm/mock.js"
import { callAnthropicTool } from "../../src/house-bot/llm/anthropic.js"
import { callOpenAiJson } from "../../src/house-bot/llm/openai.js"
import { makeClaudeTight } from "../../src/house-bot/persona/claude-tight.js"
import { makeGptAggro } from "../../src/house-bot/persona/gpt-aggro.js"
import { CostGuard, RATES } from "../../src/house-bot/cost-guard.js"
import type { TurnContext } from "../../src/house-bot/persona/types.js"

const TOOL = { name: "decide", description: "", input_schema: { type: "object" } }

function baseCtx(legal: any[]): TurnContext {
  return {
    state: {
      street: "flop",
      board: [],
      seats: [
        { index: 0, chips: 1000, hole_cards: [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }], status: "active" },
        { index: 1, chips: 1000, status: "active" },
      ],
      pot_main: 40,
      to_act: 0,
      current_bet: 0,
    } as any,
    legal_actions: legal,
    time_budget_ms: 10_000,
    hand_no: 1,
    my_stack: 1000,
    pot: 40,
    to_call: 10,
  }
}

describe("MockLLM transports", () => {
  it("anthropic mock: returns scripted tool_use payload", async () => {
    const deps = createMockAnthropic([{ raw: { action: { kind: "call" } } }])
    const ac = new AbortController()
    const r = await callAnthropicTool(deps, "sys", "user", TOOL, ac.signal)
    expect(r.raw).toEqual({ action: { kind: "call" } })
    expect(r.usage.input_tokens).toBe(50)
  })

  it("openai mock: returns scripted json content", async () => {
    const deps = createMockOpenAi([{ raw: { action: { kind: "check" } } }])
    const ac = new AbortController()
    const r = await callOpenAiJson(deps, "sys", "user", TOOL, ac.signal)
    expect(r.raw).toEqual({ action: { kind: "check" } })
    expect(r.usage.input_tokens).toBe(40)
  })
})

describe("claude-tight persona (mock)", () => {
  it("passes through a valid decision", async () => {
    const llm = createMockAnthropic([
      { raw: { action: { kind: "call" }, think: "AK suited, call." } },
    ])
    const p = makeClaudeTight({ llm, costGuard: new CostGuard({ budgetUsd: 100, rates: RATES }) })
    const ac = new AbortController()
    const d = await p.decide(baseCtx([{ kind: "fold" }, { kind: "call" }]), ac.signal)
    expect(d.action).toEqual({ kind: "call" })
    expect(d.think).toContain("AK")
  })

  it("normalizes illegal kind to legal fallback", async () => {
    const llm = createMockAnthropic([{ raw: { action: { kind: "all_in" } } }])
    const p = makeClaudeTight({ llm, costGuard: new CostGuard({ budgetUsd: 100, rates: RATES }) })
    const ac = new AbortController()
    const d = await p.decide(baseCtx([{ kind: "fold" }, { kind: "call" }]), ac.signal)
    expect(d.action.kind).toBe("call")
  })

  it("charges cost-guard per call", async () => {
    const guard = new CostGuard({ budgetUsd: 100, rates: RATES })
    const llm = createMockAnthropic([
      { raw: { action: { kind: "call" } }, usage: { input_tokens: 100, output_tokens: 50 } },
    ])
    const p = makeClaudeTight({ llm, costGuard: guard })
    const ac = new AbortController()
    await p.decide(baseCtx([{ kind: "call" }]), ac.signal)
    expect(guard.snapshot()["claude-tight"]).toBeGreaterThan(0)
  })
})

describe("gpt-aggro persona (mock)", () => {
  it("passes through a valid decision", async () => {
    const llm = createMockOpenAi([
      { raw: { action: { kind: "raise", amount: 50 }, think: "pressuring villain" } },
    ])
    const p = makeGptAggro({ llm, costGuard: new CostGuard({ budgetUsd: 100, rates: RATES }) })
    const ac = new AbortController()
    const d = await p.decide(
      baseCtx([{ kind: "fold" }, { kind: "call" }, { kind: "raise", min: 20, max: 200 }]),
      ac.signal,
    )
    expect(d.action).toEqual({ kind: "raise", amount: 50 })
    expect(d.think).toContain("pressuring")
  })

  it("clamps raise amount outside [min,max]", async () => {
    const llm = createMockOpenAi([
      { raw: { action: { kind: "raise", amount: 99999 } } },
    ])
    const p = makeGptAggro({ llm, costGuard: new CostGuard({ budgetUsd: 100, rates: RATES }) })
    const ac = new AbortController()
    const d = await p.decide(
      baseCtx([{ kind: "raise", min: 20, max: 200 }]),
      ac.signal,
    )
    expect(d.action).toEqual({ kind: "raise", amount: 200 })
  })
})
