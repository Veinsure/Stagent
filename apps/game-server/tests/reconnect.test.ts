import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables } from "@stagent/db-schema"

describe("reconnect", () => {
  let ts: TestServer
  let tableId: string

  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({
      slug: "rc-table", game_kind: "texas_holdem", status: "live",
      blinds: { sb: 5, bb: 10 }, max_seats: 6,
    }).returning({ id: tables.id })
    tableId = t!.id
    process.env.RECONNECT_GRACE_MS = "300"
    await ts.registry.loadAll()
  })

  afterEach(async () => {
    delete process.env.RECONNECT_GRACE_MS
    await ts.cleanup()
  })

  it("re-authenticates with same owner_token after reconnect", async () => {
    const c1 = await createMcpClientWs(ts.wsUrl)
    const { owner_token, agent_id } = await c1.call("register_agent", { name: "bot" })
    c1.setOwnerToken(owner_token)
    c1.close()
    // Reconnect
    const c2 = await createMcpClientWs(ts.wsUrl)
    c2.setOwnerToken(owner_token)
    // Any auth-required call confirms re-auth
    const joined = await c2.call("join_table", { table_id: tableId })
    expect(joined.seat_index).toBeGreaterThanOrEqual(0)
    c2.close()
  })
})
