import WebSocket from "ws"
import type { ToolName, ToolInput, ToolOutput } from "./schema.js"

interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void }

export interface WsClient {
  call<T extends ToolName>(name: T, args: ToolInput<T>): Promise<ToolOutput<T>>
  setOwnerToken(t: string): void
  close(): void
}

export interface WsClientOptions {
  callTimeoutMs?: number
}

export async function createMcpClientWs(url: string, opts: WsClientOptions = {}): Promise<WsClient> {
  const callTimeoutMs = opts.callTimeoutMs ?? 30_000
  const ws = new WebSocket(url)
  const pending = new Map<string, Pending>()
  let seq = 0
  let ownerToken: string | null = null

  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve())
    ws.once("error", reject)
  })

  const failAll = (reason: Error) => {
    for (const [, p] of pending) p.reject(reason)
    pending.clear()
  }
  ws.on("error", (e) => failAll(e instanceof Error ? e : new Error(String(e))))
  ws.on("close", () => failAll(new Error("ws closed")))

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      const id = String(msg.id)
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      if (msg.error) p.reject(new Error(`${msg.error.code}: ${msg.error.message}`))
      else p.resolve(msg.result)
    } catch (e) {
      console.warn("mcp-tools ws: malformed frame", e)
    }
  })

  return {
    call<T extends ToolName>(name: T, args: ToolInput<T>): Promise<ToolOutput<T>> {
      const id = String(++seq)
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
        const timer = setTimeout(() => {
          if (pending.delete(id)) reject(new Error(`mcp-tools ws: call timeout after ${callTimeoutMs}ms (${name})`))
        }, callTimeoutMs)
        timer.unref?.()
        ws.send(JSON.stringify({ id, method: name, params: args, owner_token: ownerToken }))
      })
    },
    setOwnerToken(t: string) { ownerToken = t },
    close() { ws.close() },
  }
}
