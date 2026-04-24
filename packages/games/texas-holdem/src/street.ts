import type { Draft } from "immer"
import type { TexasHoldemState, Street } from "./types.js"
import { drawN } from "./deck.js"

const NEXT: Record<Street, Street> = {
  preflop: "flop",
  flop: "turn",
  turn: "river",
  river: "showdown",
  showdown: "showdown",
}

const DEAL_COUNT: Record<Street, number> = {
  preflop: 0,
  flop: 3,
  turn: 1,
  river: 1,
  showdown: 0,
}

/** Mutate-in-place (Immer draft) advance to the next street, deal cards, reset bets. */
export function advanceStreet(draft: Draft<TexasHoldemState>): void {
  const next = NEXT[draft.street]
  draft.street = next

  // Deal community cards
  const toDeal = DEAL_COUNT[next]
  if (toDeal > 0) {
    const { drawn, rest } = drawN(draft.deck_remaining, toDeal)
    draft.board.push(...drawn)
    draft.deck_remaining = rest
  }

  // Reset per-street bets and turn pointer
  if (next !== "showdown") {
    draft.current_bet = 0
    draft.min_raise = draft.blinds.bb
    for (const s of draft.seats) {
      s.contributed_this_street = 0
      s.has_acted_this_street = false
    }
    // First to act post-flop = first active seat after button
    const n = draft.seats.length
    for (let step = 1; step <= n; step++) {
      const idx = (draft.button + step) % n
      if (draft.seats[idx]!.status === "active") {
        draft.to_act = idx
        return
      }
    }
    draft.to_act = null
  } else {
    draft.to_act = null
  }
}
