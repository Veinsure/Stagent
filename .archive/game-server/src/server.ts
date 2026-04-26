import { createServer, type Server } from "node:http"
import { WebSocketServer, type WebSocket } from "ws"
import { newConnection, type McpConnection } from "./mcp/connection.js"
import { attachWs, type RequestFrame, type ResponseFrame } from "./mcp/transport-ws.js"
import { createHandler } from "./mcp/handler.js"
import type { Db } from "./db/client.js"
import type { TableRegistry } from "./actors/table-registry.js"

export interface ServerDeps {
  db: Db
  registry: TableRegistry
}

export function createGameServer(deps: ServerDeps): { server: Server; close: () => Promise<void> } {
  const handle = createHandler(deps)
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
      attachWs(conn, handle)
    } catch (err) {
      console.error("connection init failed:", err)
      ws.close(1011, "internal error")
    }
  })

  return {
    server,
    close: async () => {
      for (const client of wss.clients) client.terminate()
      await new Promise<void>((resolve, reject) => {
        wss.close(() => server.close((err) => err ? reject(err) : resolve()))
      })
      await deps.registry.stopAll()
    },
  }
}

export async function listen(server: Server, port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, () => resolve())
  })
}
