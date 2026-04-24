import type { TexasHoldemState } from "./types.js"
import { bestOfSeven, compareHands } from "./evaluator.js"
import type { AgentId } from "@stagent/shared"

export interface WinnerShare {
  agent_id: AgentId
  won: number
}

export function resolveShowdown(state: TexasHoldemState): WinnerShare[] {
  const inHand = state.seats.filter((s) => s.status !== "folded" && s.status !== "sitting_out")

  if (inHand.length === 1) {
    return [{ agent_id: inHand[0]!.agent_id, won: state.pot_main }]
  }

  // Build side pots from contributed_total layers.
  const contribs = [...new Set(state.seats.map((s) => s.contributed_total))]
    .filter((v) => v > 0)
    .sort((a, b) => a - b)

  const totals = new Map<string, number>()
  let prev = 0
  for (const cap of contribs) {
    const layer = cap - prev
    const contributorsCount = state.seats.filter((s) => s.contributed_total >= cap).length
    const potAmount = layer * contributorsCount
    const eligible = inHand.filter((s) => s.contributed_total >= cap)

    // Best hand among eligible
    const ranked = eligible
      .map((s) => ({ seat: s, rank: bestOfSeven([...s.hole_cards!, ...state.board]) }))
      .sort((a, b) => compareHands(b.rank, a.rank))

    if (ranked.length === 0) {
      prev = cap
      continue
    }
    const best = ranked[0]!.rank
    const tied = ranked.filter((r) => compareHands(r.rank, best) === 0)
    const share = Math.floor(potAmount / tied.length)
    const remainder = potAmount - share * tied.length

    tied.forEach((t, i) => {
      const cur = totals.get(t.seat.agent_id) ?? 0
      totals.set(t.seat.agent_id, cur + share + (i === 0 ? remainder : 0))
    })

    prev = cap
  }

  return [...totals.entries()].map(([agent_id, won]) => ({ agent_id, won }))
}
