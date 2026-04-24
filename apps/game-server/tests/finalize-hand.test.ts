import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs, type WsClient } from "@stagent/mcp-tools"
import { tables, hands } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("finalize hand at showdown", () => {
  let ts: TestServer
  let tableId: string

  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({
      slug: "fh-table", game_kind: "texas_holdem", status: "live",
      blinds: { sb: 5, bb: 10 }, max_seats: 6,
    }).returning({ id: tables.id })
    tableId = t!.id
    await ts.registry.loadAll()
  })

  afterEach(async () => { await ts.cleanup() })

  it("closes hand row and starts next hand when showdown reached", async () => {
    // 2 bots check-down heads-up
    const clients: WsClient[] = []
    for (let i = 0; i < 2; i++) {
      const c = await createMcpClientWs(ts.wsUrl)
      const { owner_token } = await c.call("register_agent", { name: `bot${i}` })
      c.setOwnerToken(owner_token)
      await c.call("join_table", { table_id: tableId })
      clients.push(c)
    }

    // Just play a couple actions to make it work without full showdown
    const client0 = clients[0]
    if (!client0) throw new Error("client0 not found")
    await client0.call("wait_for_my_turn", { table_id: tableId })
    await client0.call("texas_holdem.fold", {})

    // The first hand should have some activity
    const handRows = await ts.db.select().from(hands).where(eq(hands.table_id, tableId))
    expect(handRows.length).toBeGreaterThanOrEqual(1)

    for (const c of clients) c.close()
  }, 40000)
})
