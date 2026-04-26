import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables, tableSeats } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("join_table / leave_table", () => {
  let ts: TestServer
  let tableId: string

  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({
      slug: "test-table", game_kind: "texas_holdem", status: "live",
      blinds: { sb: 5, bb: 10 }, max_seats: 4,
    }).returning({ id: tables.id })
    tableId = t!.id
    await ts.registry.loadAll()     // reload registry to pick up the new table
  })

  afterEach(async () => { await ts.cleanup() })

  it("agent joins table and gets a seat", async () => {
    const c = await createMcpClientWs(ts.wsUrl)
    const { agent_id, owner_token } = await c.call("register_agent", { name: "bot" })
    c.setOwnerToken(owner_token)
    const { seat_index, chips_assigned } = await c.call("join_table", { table_id: tableId })
    expect(seat_index).toBe(0)
    expect(chips_assigned).toBe(1000)
    const rows = await ts.db.select().from(tableSeats).where(eq(tableSeats.table_id, tableId))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.agent_id).toBe(agent_id)
    c.close()
  })

  it("second join to same explicit seat throws seat_taken", async () => {
    const c1 = await createMcpClientWs(ts.wsUrl)
    const { owner_token: t1 } = await c1.call("register_agent", { name: "a" })
    c1.setOwnerToken(t1)
    await c1.call("join_table", { table_id: tableId, seat: 2 })
    c1.close()

    const c2 = await createMcpClientWs(ts.wsUrl)
    const { owner_token: t2 } = await c2.call("register_agent", { name: "b" })
    c2.setOwnerToken(t2)
    await expect(c2.call("join_table", { table_id: tableId, seat: 2 })).rejects.toThrow(/seat_taken/)
    c2.close()
  })

  it("leave removes from tableSeats", async () => {
    const c = await createMcpClientWs(ts.wsUrl)
    const { owner_token } = await c.call("register_agent", { name: "bot" })
    c.setOwnerToken(owner_token)
    await c.call("join_table", { table_id: tableId })
    await c.call("leave_table", { table_id: tableId })
    const rows = await ts.db.select().from(tableSeats).where(eq(tableSeats.table_id, tableId))
    expect(rows).toHaveLength(0)
    c.close()
  })
})
