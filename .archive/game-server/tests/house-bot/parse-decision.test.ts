import { describe, it, expect } from "vitest"
import { parseDecision } from "../../src/house-bot/parse-decision.js"
import type { LegalAction } from "../../src/house-bot/persona/types.js"

const LEGAL: LegalAction[] = [
  { kind: "fold" },
  { kind: "call" },
  { kind: "raise", min: 20, max: 200 },
]

describe("parseDecision", () => {
  it("passes through valid decision", () => {
    const d = parseDecision({ action: { kind: "call" } }, LEGAL)
    expect(d.action).toEqual({ kind: "call" })
  })

  it("falls back to call (check > call > fold) when kind not in legal", () => {
    expect(parseDecision({ action: { kind: "check" } }, LEGAL).action.kind).toBe("call")
    expect(parseDecision({ action: { kind: "all_in" } }, [{ kind: "fold" }]).action.kind).toBe("fold")
  })

  it("clamps raise.amount into [min,max]", () => {
    expect(parseDecision({ action: { kind: "raise", amount: 5 } }, LEGAL).action).toEqual({ kind: "raise", amount: 20 })
    expect(parseDecision({ action: { kind: "raise", amount: 9999 } }, LEGAL).action).toEqual({ kind: "raise", amount: 200 })
  })

  it("raise without amount → clamps to min", () => {
    expect(parseDecision({ action: { kind: "raise" } }, LEGAL).action).toEqual({ kind: "raise", amount: 20 })
  })

  it("truncates think/say over limit", () => {
    const d = parseDecision({ action: { kind: "call" }, think: "x".repeat(2000), say: "y".repeat(400) }, LEGAL)
    expect(d.think!.length).toBe(1000)
    expect(d.say!.length).toBe(280)
  })

  it("malformed input falls back to safe action", () => {
    expect(parseDecision(null, LEGAL).action.kind).toBe("call")
    expect(parseDecision({}, LEGAL).action.kind).toBe("call")
    expect(parseDecision({ action: "call" }, LEGAL).action.kind).toBe("call")
    expect(parseDecision(42, LEGAL).action.kind).toBe("call")
  })

  it("prefers check when legal", () => {
    expect(parseDecision({ action: { kind: "raise", amount: 50 } }, [
      { kind: "check" }, { kind: "fold" },
    ]).action.kind).toBe("check")
  })
})
