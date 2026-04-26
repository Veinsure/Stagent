import type { WebSocket } from "ws"
import type { McpConnection } from "./connection.js"

export interface RequestFrame { id: string; method: string; params: unknown; owner_token?: string }
export interface ResponseFrame { id: string; result?: unknown; error?: { code: string; message: string } }

export function attachWs(conn: McpConnection, handle: (conn: McpConnection, frame: RequestFrame) => Promise<ResponseFrame>): void {
  conn.ws.on("message", async (raw: Buffer) => {
    let frame: RequestFrame
    try { frame = JSON.parse(raw.toString()) }
    catch { conn.ws.close(1003, "invalid json"); return }
    if (!frame.id || !frame.method) { conn.ws.close(1003, "invalid frame"); return }
    try {
      if (frame.owner_token) conn.owner_token = frame.owner_token
      const resp = await handle(conn, frame)
      conn.ws.send(JSON.stringify(resp))
    } catch (e) {
      conn.ws.send(JSON.stringify({
        id: frame.id,
        error: { code: "internal", message: e instanceof Error ? e.message : String(e) },
      }))
    }
  })
}

export function send(ws: WebSocket, frame: ResponseFrame): void {
  ws.send(JSON.stringify(frame))
}
