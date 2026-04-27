import type { GameEvent } from "@/lib/ws-client"

export interface ReplayBufferState {
  startedAt: number
  events: GameEvent[]
  handsCount: number
}

export function newBuffer(): ReplayBufferState {
  return { startedAt: Date.now(), events: [], handsCount: 0 }
}

export function appendEvent(buf: ReplayBufferState, e: GameEvent): ReplayBufferState {
  const handsCount = e.type === "hand_start" ? buf.handsCount + 1 : buf.handsCount
  return { ...buf, events: [...buf.events, e], handsCount }
}

const MIN_EVENTS_FOR_REPLAY = 5

export function eligibleForReplay(buf: ReplayBufferState): boolean {
  return buf.events.length >= MIN_EVENTS_FOR_REPLAY
}

/**
 * Fire-and-forget replay upload. Uses sendBeacon so it survives tab close.
 */
export function uploadReplayBeacon(input: {
  room: string
  roomKind: "demo" | "private"
  buf: ReplayBufferState
  visibility: "public" | "private"
}): boolean {
  const body = JSON.stringify({
    room: input.room,
    room_kind: input.roomKind,
    started_at: input.buf.startedAt,
    ended_at: Date.now(),
    hands_count: input.buf.handsCount,
    events: input.buf.events,
    visibility: input.visibility,
  })
  const blob = new Blob([body], { type: "application/json" })
  return navigator.sendBeacon("/api/replays", blob)
}
