import type { TexasHoldemState, Seat } from "./types.js"
import { freshDeck, shuffle, drawN } from "./deck.js"
import { createRng } from "./rng.js"
import type { TableOpts } from "@stagent/shared"

export function createTable(opts: TableOpts): TexasHoldemState {
  if (opts.seats.length < 2) throw new Error("need >= 2 seats")

  const blinds = (opts.blinds as { sb: number; bb: number } | undefined) ?? { sb: 5, bb: 10 }
  const rng = createRng(opts.rng_seed)
  let deck = shuffle(freshDeck(), rng)

  const seats: Seat[] = opts.seats.map((s, i) => ({
    index: i,
    agent_id: s.agent_id,
    chips: s.chips,
    contributed_this_street: 0,
    contributed_total: 0,
    status: "active",
    has_acted_this_street: false,
  }))

  // Deal 2 hole cards per seat
  for (let i = 0; i < seats.length; i++) {
    const { drawn, rest } = drawN(deck, 2)
    seats[i]!.hole_cards = [drawn[0]!, drawn[1]!]
    deck = rest
  }

  const button = 0
  // Heads-up (2-handed): button is the small blind and acts first preflop.
  // 3+ handed: SB sits after button, BB after SB, UTG after BB.
  const isHeadsUp = seats.length === 2
  const sbIdx = isHeadsUp ? button : (button + 1) % seats.length
  const bbIdx = isHeadsUp
    ? (button + 1) % seats.length
    : (button + 2) % seats.length

  // Post blinds
  const sbAmt = Math.min(blinds.sb, seats[sbIdx]!.chips)
  const bbAmt = Math.min(blinds.bb, seats[bbIdx]!.chips)
  seats[sbIdx]!.chips -= sbAmt
  seats[sbIdx]!.contributed_this_street = sbAmt
  seats[sbIdx]!.contributed_total = sbAmt
  seats[bbIdx]!.chips -= bbAmt
  seats[bbIdx]!.contributed_this_street = bbAmt
  seats[bbIdx]!.contributed_total = bbAmt

  // Preflop first to act: heads-up = button (SB); 3+ handed = seat after BB.
  const utg = isHeadsUp ? button : (bbIdx + 1) % seats.length

  return {
    seats,
    button,
    street: "preflop",
    board: [],
    pot_main: sbAmt + bbAmt,
    pots: [],
    current_bet: bbAmt,
    min_raise: blinds.bb,
    to_act: utg,
    blinds,
    hand_no: 1,
    rng_seed: opts.rng_seed,
    rng_state: rng.snapshot(),
    deck_remaining: deck,
    history: [
      { kind: "blind_posted", by: seats[sbIdx]!.agent_id, amount: sbAmt, ts: 0 },
      { kind: "blind_posted", by: seats[bbIdx]!.agent_id, amount: bbAmt, ts: 0 },
    ],
  }
}
