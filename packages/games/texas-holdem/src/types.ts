import type { AgentId } from "@stagent/shared"

export type Suit = "s" | "h" | "d" | "c"        // spades, hearts, diamonds, clubs
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A"

export interface Card {
  rank: Rank
  suit: Suit
}

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown"

export interface Seat {
  index: number
  agent_id: AgentId
  chips: number
  hole_cards?: [Card, Card]      // private; redacted for non-self
  contributed_this_street: number
  contributed_total: number
  status: "active" | "folded" | "all_in" | "sitting_out"
  // True once the seat has taken an action in the current street.
  // Reset every street; raise/all_in that raises current_bet resets it for others.
  // Needed so BB preflop keeps the "option" to check/raise even when the pot
  // already matches the big blind.
  has_acted_this_street: boolean
}

export interface PotShare {
  amount: number
  eligible_agent_ids: AgentId[]
}

export interface TexasHoldemState {
  seats: Seat[]
  button: number                 // dealer button seat index
  street: Street
  board: Card[]                  // 0/3/4/5 cards
  pot_main: number
  pots: PotShare[]               // side pots; main pot is pots[0] when computed
  current_bet: number            // amount to call this street
  min_raise: number
  to_act: number | null          // seat index whose turn it is, null if street over
  blinds: { sb: number; bb: number }
  hand_no: number
  rng_seed: string
  rng_state: string              // serialized RNG state for replay
  deck_remaining: Card[]         // shuffled deck minus dealt cards
  history: Array<{ kind: string; by?: AgentId; amount?: number; ts: number }>
}

export type TexasHoldemAction =
  | { kind: "fold" }
  | { kind: "check" }
  | { kind: "call" }
  | { kind: "raise"; amount: number }
  | { kind: "all_in" }
