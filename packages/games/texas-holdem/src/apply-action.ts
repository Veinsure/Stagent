import { produce } from "immer"
import type { TexasHoldemState, TexasHoldemAction, Seat } from "./types.js"
import type { AgentId, BroadcastEvent } from "@stagent/shared"
import { advanceStreet } from "./street.js"

function findSeat(state: TexasHoldemState, by: AgentId): Seat {
  const s = state.seats.find((x) => x.agent_id === by)
  if (!s) throw new Error(`not_seated: ${by}`)
  return s
}

function nextActive(state: TexasHoldemState, from: number): number | null {
  const n = state.seats.length
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n
    const seat = state.seats[idx]!
    if (seat.status === "active") return idx
  }
  return null
}

function isStreetSettled(state: TexasHoldemState): boolean {
  const active = state.seats.filter((s) => s.status === "active")
  if (active.length <= 1) return true
  // Every active seat must have matched current_bet AND had a chance to act.
  // The has_acted_this_street flag ensures BB keeps option preflop even when
  // the pot already equals the big blind.
  return active.every(
    (s) => s.contributed_this_street === state.current_bet && s.has_acted_this_street,
  )
}

export function applyAction(
  state: TexasHoldemState,
  action: TexasHoldemAction,
  by: AgentId,
): { state: TexasHoldemState; events: BroadcastEvent[] } {
  const seat = findSeat(state, by)
  if (state.to_act !== seat.index) throw new Error(`not_your_turn`)
  const events: BroadcastEvent[] = []

  const next = produce(state, (draft) => {
    const me = draft.seats[seat.index]!
    switch (action.kind) {
      case "fold":
        me.status = "folded"
        me.has_acted_this_street = true
        events.push({ kind: "action", payload: { by, kind: "fold" }, ts: Date.now() })
        break
      case "check":
        if (me.contributed_this_street !== draft.current_bet) {
          throw new Error(`illegal_action: cannot check, must call ${draft.current_bet}`)
        }
        me.has_acted_this_street = true
        events.push({ kind: "action", payload: { by, kind: "check" }, ts: Date.now() })
        break
      case "call": {
        const owe = draft.current_bet - me.contributed_this_street
        if (owe <= 0) throw new Error(`illegal_action: nothing to call`)
        const pay = Math.min(owe, me.chips)
        me.chips -= pay
        me.contributed_this_street += pay
        me.contributed_total += pay
        draft.pot_main += pay
        me.has_acted_this_street = true
        if (me.chips === 0) me.status = "all_in"
        events.push({
          kind: "action",
          payload: { by, kind: "call", amount: pay },
          ts: Date.now(),
        })
        break
      }
      case "raise": {
        const totalCommit = action.amount    // total contributed_this_street after raise
        const owe = totalCommit - me.contributed_this_street
        if (owe > me.chips) throw new Error(`invalid_amount: not enough chips`)
        const minTarget = draft.current_bet + draft.min_raise
        if (totalCommit < minTarget) {
          throw new Error(
            `invalid_amount: raise must be at least ${minTarget} (current_bet=${draft.current_bet}, min_raise=${draft.min_raise})`,
          )
        }
        me.chips -= owe
        me.contributed_this_street = totalCommit
        me.contributed_total += owe
        draft.pot_main += owe
        const raiseSize = totalCommit - draft.current_bet
        draft.current_bet = totalCommit
        draft.min_raise = raiseSize
        me.has_acted_this_street = true
        // Raise reopens betting: every other active seat must act again.
        for (const other of draft.seats) {
          if (other.index !== me.index && other.status === "active") {
            other.has_acted_this_street = false
          }
        }
        if (me.chips === 0) me.status = "all_in"
        events.push({
          kind: "action",
          payload: { by, kind: "raise", amount: totalCommit },
          ts: Date.now(),
        })
        break
      }
      case "all_in": {
        const owe = me.chips
        const totalCommit = me.contributed_this_street + owe
        me.contributed_this_street = totalCommit
        me.contributed_total += owe
        me.chips = 0
        draft.pot_main += owe
        const reopens = totalCommit > draft.current_bet
        if (reopens) {
          const raiseSize = totalCommit - draft.current_bet
          draft.current_bet = totalCommit
          if (raiseSize > draft.min_raise) draft.min_raise = raiseSize
          // All-in above current_bet reopens betting for active seats.
          for (const other of draft.seats) {
            if (other.index !== me.index && other.status === "active") {
              other.has_acted_this_street = false
            }
          }
        }
        me.has_acted_this_street = true
        me.status = "all_in"
        events.push({
          kind: "action",
          payload: { by, kind: "all_in", amount: owe },
          ts: Date.now(),
        })
        break
      }
    }

    // advance to_act
    if (isStreetSettled(draft)) {
      advanceStreet(draft)
    } else {
      draft.to_act = nextActive(draft, seat.index)
    }
  })

  return { state: next, events }
}
