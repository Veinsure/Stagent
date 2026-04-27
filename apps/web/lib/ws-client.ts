export type GameEvent =
  | { type: "snapshot"; state: any }
  | { type: "hand_start"; handId: number; dealer: number }
  | { type: "action"; seat: number; action: string; amount?: number }
  | { type: "board"; cards: any[] }
  | { type: "showdown"; winners: number[]; reveal: Record<number, any[]> }
  | { type: "seat_update"; seat: number; kind: "empty" | "bot" | "agent"; name?: string }
  | { type: "say"; seat: number; text: string }
  | { type: "think"; seat: number; agentId: string | null; text: string; ts: number }

export interface WsClient {
  close(): void
}

export function openRoomSocket(
  edgeBase: string,
  room: string,
  onEvent: (e: GameEvent) => void,
): WsClient {
  let closed = false
  let ws: WebSocket | null = null
  let retryDelay = 500

  const wsBase = edgeBase.replace(/^http/, "ws")
  const url = `${wsBase}/c/${room}/ws`

  const connect = () => {
    if (closed) return
    ws = new WebSocket(url)
    ws.addEventListener("message", (e) => {
      try {
        const evt = JSON.parse(e.data as string) as GameEvent
        onEvent(evt)
      } catch (err) {
        console.warn("bad event payload", err)
      }
    })
    ws.addEventListener("close", () => {
      if (closed) return
      const next = retryDelay
      retryDelay = Math.min(retryDelay * 2, 10_000)
      setTimeout(connect, next)
    })
    ws.addEventListener("open", () => {
      retryDelay = 500
    })
  }
  connect()

  return {
    close() {
      closed = true
      ws?.close()
    },
  }
}
