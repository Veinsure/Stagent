import type { GameModule } from "@stagent/shared"
import type { TexasHoldemState, TexasHoldemAction } from "./types.js"
import { createTable } from "./state-init.js"
import { applyAction } from "./apply-action.js"
import { legalActions, type LegalAction } from "./legal-actions.js"
import { redactForViewer, redactForAgent } from "./redaction.js"
import { resolveShowdown } from "./showdown.js"

export const NAME = "texas_holdem"

export const TexasHoldemModule: GameModule<TexasHoldemState, TexasHoldemAction, LegalAction> = {
  name: NAME,
  createTable,
  applyAction(state, action, by) {
    const result = applyAction(state, action, by)
    // If we just transitioned into showdown, distribute pot.
    if (result.state.street === "showdown" && result.state.pot_main > 0) {
      const winners = resolveShowdown(result.state)
      // Mutate copy: distribute chips, zero pot
      const next = {
        ...result.state,
        seats: result.state.seats.map((s) => {
          const w = winners.find((w) => w.agent_id === s.agent_id)
          return w ? { ...s, chips: s.chips + w.won } : s
        }),
        pot_main: 0,
      }
      return {
        state: next,
        events: [
          ...result.events,
          { kind: "hand_ended", payload: { winners }, ts: Date.now() },
        ],
      }
    }
    return result
  },
  legalActions: (state, by) => legalActions(state, by),
  serialize: (s) => s,
  deserialize: (raw) => raw as TexasHoldemState,
  redactForViewer,
  redactForAgent,
}

export * from "./types.js"
export type { LegalAction } from "./legal-actions.js"
