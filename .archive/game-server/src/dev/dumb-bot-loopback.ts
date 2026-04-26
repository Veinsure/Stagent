import { EventEmitter } from "node:events"
import { LoopbackTransport, type LoopbackConnection } from "@stagent/mcp-tools"
import type { Db } from "../db/client.js"
import type { TableRegistry } from "../actors/table-registry.js"
import { createHandler } from "../mcp/handler.js"

async function loopPlay(client: LoopbackConnection, table_id: string) {
  // Dumb bot loops until an error (e.g. registry stopped in tests) tears us down.
  while (true) {
    try {
      const turn = await client.call("wait_for_my_turn", { table_id, timeout_s: 5 })
      if (turn.kind === "timeout") continue
      const pick = turn.legal_actions.find((a) => a.kind === "check")
                ?? turn.legal_actions.find((a) => a.kind === "call")
                ?? ({ kind: "fold" } as const)
      await client.call(`texas_holdem.${pick.kind}`, {} as any)
    } catch {
      // Swallow: could be our turn raced a finalize, could be shutdown. Exit cleanly.
      return
    }
  }
}

/**
 * Wire a direct in-process connection to the MCP handler.
 * The handler expects `conn.ws` (uses `.once("close", …)` for disconnect wiring),
 * so we stub it with an EventEmitter — never emitted for loopback, so no-op.
 */
export async function spawnDumbBotLoopback(deps: { db: Db; registry: TableRegistry; name: string }): Promise<void> {
  const handler = createHandler({ db: deps.db, registry: deps.registry })
  const transport = new LoopbackTransport()

  const fakeWs = new EventEmitter() as unknown as import("ws").WebSocket
  const conn = {
    id: `loopback-${deps.name}`,
    ws: fakeWs,
    agent_id: null as string | null,
    owner_token: null as string | null,
  }
  transport.bindHandler(async (method, params) => {
    const frame: any = { id: "0", method, params }
    const resp = await handler(conn as any, frame)
    if (resp.error) throw new Error(`${resp.error.code}: ${resp.error.message}`)
    return resp.result
  })

  const client = transport.connect()
  const { agent_id, owner_token } = await client.call("register_agent", { name: deps.name })
  client.setOwnerToken(owner_token)
  conn.owner_token = owner_token
  conn.agent_id = agent_id ?? ""

  const tables = await client.call("list_tables", { game: "texas_holdem", status: "live" })
  if (tables.length === 0) throw new Error("no tables to join")
  let joined = false
  for (const t of tables) {
    try {
      await client.call("join_table", { table_id: t.id })
      await loopPlay(client, t.id)
      joined = true
      break
    } catch (e) {
      const msg = (e as Error).message
      if (msg.includes("table_full") || msg.includes("already_seated_here")) continue
      throw e
    }
  }
  if (!joined) throw new Error("no table available")
}
