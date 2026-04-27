import type { TexasHoldemState } from "@stagent/texas-holdem"

export type Seat =
  | { kind: "empty" }
  | { kind: "bot"; name: string; chips: number }
  | {
      kind: "agent"
      name: string
      chips: number
      mcpSessionId: string
      lastSeenMs: number
      userId: string | null
      agentId: string | null
      avatarUrl: string | null
      color: string | null
    }

export interface DOState {
  kind: "demo" | "private"
  room: string
  seats: Seat[]
  engine: TexasHoldemState | null
  handsPlayed: number
  actionLog: Array<{ ts: number; text: string }>
  lastActivityMs: number
  ownerToken?: string
}

export function publicView(s: DOState): unknown {
  const engine = s.engine ? {
    ...s.engine,
    seats: s.engine.seats.map(seat => ({ ...seat, hole_cards: undefined })),
    deck_remaining: [],
  } : null
  return { kind: s.kind, room: s.room, seats: s.seats, engine, handsPlayed: s.handsPlayed }
}
