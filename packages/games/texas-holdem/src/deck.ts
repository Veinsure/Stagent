import type { Card } from "./types.js"
import { allCards } from "./card.js"
import type { Rng } from "./rng.js"

export function freshDeck(): Card[] {
  return allCards()
}

/** Fisher-Yates shuffle, deterministic given Rng. */
export function shuffle(cards: Card[], rng: Rng): Card[] {
  const out = cards.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

export function drawN(deck: Card[], n: number): { drawn: Card[]; rest: Card[] } {
  if (n > deck.length) throw new Error(`drawN: requested ${n}, have ${deck.length}`)
  return { drawn: deck.slice(0, n), rest: deck.slice(n) }
}
