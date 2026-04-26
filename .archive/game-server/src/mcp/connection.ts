import type { WebSocket } from "ws"

export interface McpConnection {
  id: string
  ws: WebSocket
  agent_id: string | null
  owner_token: string | null
}

let connIdCounter = 0
export function newConnection(ws: WebSocket): McpConnection {
  return { id: `ws-${++connIdCounter}`, ws, agent_id: null, owner_token: null }
}
