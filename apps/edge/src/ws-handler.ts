import type { GameEvent } from "./events.js"

export function handleWsUpgrade(ctx: DurableObjectState): Response {
  const pair = new WebSocketPair()
  const client = pair[0]
  const server = pair[1]
  ctx.acceptWebSocket(server, ["viewer"])
  return new Response(null, { status: 101, webSocket: client })
}

export function broadcastEvent(ctx: DurableObjectState, evt: GameEvent): void {
  const payload = JSON.stringify(evt)
  for (const ws of ctx.getWebSockets("viewer")) {
    try { ws.send(payload) } catch { /* closed */ }
  }
}
