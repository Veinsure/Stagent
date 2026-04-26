import { describe, it, expect } from "vitest"
import { renderTurnUser } from "../../src/house-bot/render-turn.js"
import type { TurnContext } from "../../src/house-bot/persona/types.js"

const BASE: TurnContext = {
  state: {
    street: "flop",
    board: [
      { rank: "A", suit: "h" },
      { rank: "K", suit: "d" },
      { rank: "2", suit: "c" },
    ],
    seats: [
      {
        index: 0,
        chips: 980,
        hole_cards: [
          { rank: "Q", suit: "s" },
          { rank: "J", suit: "s" },
        ],
        status: "active",
      },
      { index: 1, chips: 1000, status: "active" },
      { index: 2, chips: 1000, status: "folded" },
    ],
    pot_main: 40,
    to_act: 0,
    current_bet: 0,
  } as any,
  legal_actions: [{ kind: "check" }, { kind: "raise", min: 10, max: 980 }],
  time_budget_ms: 30_000,
  hand_no: 7,
  my_stack: 980,
  pot: 40,
  to_call: 0,
}

describe("renderTurnUser", () => {
  it("includes my hole cards but anonymizes opponents", () => {
    const out = renderTurnUser(BASE)
    expect(out).toContain("Qs")
    expect(out).toContain("Js")
    expect(out).toMatch(/opp_1/)
    expect(out).toMatch(/opp_2/)
    expect(out).not.toMatch(/agent_id/)
    expect(out).not.toMatch(/seat_index/)
  })

  it("lists legal actions with ranges", () => {
    const out = renderTurnUser(BASE)
    expect(out).toContain("check")
    expect(out).toMatch(/raise.*10.*980/)
  })

  it("stays under ~800 tokens worth (~3200 chars heuristic)", () => {
    const out = renderTurnUser(BASE)
    expect(out.length).toBeLessThan(3200)
  })

  it("does not leak opponent hole_cards even if state includes them", () => {
    const withOppCards = structuredClone(BASE)
    ;(withOppCards.state as any).seats[1].hole_cards = [
      { rank: "K", suit: "h" },
      { rank: "K", suit: "c" },
    ]
    const rendered = renderTurnUser(withOppCards)
    expect(rendered).not.toContain("Kh")
    expect(rendered).not.toContain("Kc")
  })

  it("flags folded / all_in opponents", () => {
    const out = renderTurnUser(BASE)
    expect(out).toContain("[folded]")
  })
})
