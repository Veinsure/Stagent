import type { TexasHoldemState } from "./types.js"
import type { AgentId } from "@stagent/shared"

export type LegalAction =
  | { kind: "fold" }
  | { kind: "check" }
  | { kind: "call" }
  | { kind: "raise"; min: number; max: number }
  | { kind: "all_in" }

export function legalActions(state: TexasHoldemState, by: AgentId): LegalAction[] {
  const seat = state.seats.find((s) => s.agent_id === by)
  if (!seat || state.to_act !== seat.index) return []
  if (seat.status !== "active") return []

  const owe = state.current_bet - seat.contributed_this_street
  const out: LegalAction[] = []

  out.push({ kind: "fold" })
  if (owe === 0) out.push({ kind: "check" })
  if (owe > 0 && seat.chips >= owe) out.push({ kind: "call" })

  const minRaiseTarget = state.current_bet + state.min_raise
  const maxRaiseTarget = seat.contributed_this_street + seat.chips
  if (minRaiseTarget <= maxRaiseTarget) {
    out.push({ kind: "raise", min: minRaiseTarget, max: maxRaiseTarget })
  }

  if (seat.chips > 0) out.push({ kind: "all_in" })

  return out
}
