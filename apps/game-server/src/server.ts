import { createServer, type Server } from "node:http"
import { WebSocketServer, type WebSocket } from "ws"
import { newConnection, type McpConnection } from "./mcp/connection.js"
import { attachWs, type RequestFrame, type ResponseFrame } from "./mcp/transport-ws.js"

export interface ServerDeps {
  handle?: (conn: McpConnection, frame: RequestFrame) => Promise<ResponseFrame>
}

export function createGameServer(deps: ServerDeps): { server: Server; close: () => Promise<void> } {
  const server = createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "content-type": "text/plain" })
      res.end("ok")
      return
    }
    res.writeHead(404)
    res.end()
  })

  const wss = new WebSocketServer({ server, path: "/mcp" })
  wss.on("connection", (ws: WebSocket) => {
    try {
      const conn = newConnection(ws)
      if (deps.handle) attachWs(conn, deps.handle)
    } catch (err) {
      console.error("connection init failed:", err)
      ws.close(1011, "internal error")
    }
  })

  return {
    server,
    close: () => new Promise<void>((resolve, reject) => {
      for (const client of wss.clients) client.terminate()
      wss.close(() => server.close((err) => err ? reject(err) : resolve()))
    }),
  }
}

export async function listen(server: Server, port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, () => resolve())
  })
}
