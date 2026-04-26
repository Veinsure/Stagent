import type { Card } from "@stagent/texas-holdem"

export type GameEvent =
  | { type: "snapshot"; state: unknown }
  | { type: "hand_start"; handId: number; dealer: number }
  | { type: "action"; seat: number; action: string; amount?: number }
  | { type: "board"; cards: Card[] }
  | { type: "showdown"; winners: number[]; reveal: Record<number, Card[]> }
  | { type: "seat_update"; seat: number; kind: "empty" | "bot" | "agent"; name?: string }
  | { type: "say"; seat: number; text: string }
