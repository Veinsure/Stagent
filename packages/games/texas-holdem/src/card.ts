import type { Card, Rank, Suit } from "./types.js"

const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
const SUITS: Suit[] = ["s", "h", "d", "c"]
const RANK_VALUE: Record<Rank, number> = Object.fromEntries(
  RANKS.map((r, i) => [r, i + 2]),
) as Record<Rank, number>

export function allCards(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })))
}

export function cardToString(c: Card): string {
  return `${c.rank}${c.suit}`
}

export function parseCard(s: string): Card {
  if (s.length !== 2) throw new Error(`invalid card: ${s}`)
  const rank = s[0] as Rank
  const suit = s[1] as Suit
  if (!RANKS.includes(rank)) throw new Error(`invalid rank: ${rank}`)
  if (!SUITS.includes(suit)) throw new Error(`invalid suit: ${suit}`)
  return { rank, suit }
}

export function rankValue(r: Rank): number {
  return RANK_VALUE[r]
}

export function compareRank(a: Rank, b: Rank): number {
  return RANK_VALUE[a] - RANK_VALUE[b]
}
