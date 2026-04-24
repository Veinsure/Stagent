import { produce } from "immer"
import type { TexasHoldemState } from "./types.js"
import type { AgentId } from "@stagent/shared"

export function redactForViewer(state: TexasHoldemState): TexasHoldemState {
  return produce(state, (d) => {
    for (const s of d.seats) delete s.hole_cards
    d.deck_remaining = []
  })
}

export function redactForAgent(state: TexasHoldemState, by: AgentId): TexasHoldemState {
  return produce(state, (d) => {
    for (const s of d.seats) {
      if (s.agent_id !== by) delete s.hole_cards
    }
    d.deck_remaining = []
  })
}
