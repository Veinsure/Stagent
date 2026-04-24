import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables, tableSeats } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("seat contention", () => {
  let ts: TestServer; let tableId: string
  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({ slug: "sc", game_kind: "texas_holdem", status: "live", blinds: { sb: 5, bb: 10 }, max_seats: 6 }).returning({ id: tables.id })
    tableId = t!.id
    await ts.registry.loadAll()
  })
  afterEach(async () => { await ts.cleanup() })

  it("concurrent joins to same seat — exactly one succeeds", async () => {
    const clients = await Promise.all([0, 1].map(async (i) => {
      const c = await createMcpClientWs(ts.wsUrl)
      const { owner_token } = await c.call("register_agent", { name: `b${i}` })
      c.setOwnerToken(owner_token)
      return c
    }))
    const results = await Promise.allSettled(
      clients.map((c) => c.call("join_table", { table_id: tableId, seat: 2 }))
    )
    const success = results.filter((r) => r.status === "fulfilled")
    const failure = results.filter((r) => r.status === "rejected")
    expect(success).toHaveLength(1)
    expect(failure).toHaveLength(1)
    expect((failure[0] as PromiseRejectedResult).reason.message).toMatch(/seat_taken/)
    const rows = await ts.db.select().from(tableSeats).where(eq(tableSeats.table_id, tableId))
    expect(rows).toHaveLength(1)
    for (const c of clients) c.close()
  })
})
