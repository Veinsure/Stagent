import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables, actions } from "@stagent/db-schema"

describe("turn timer", () => {
  let ts: TestServer
  let tableId: string

  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({
      slug: "tt-table", game_kind: "texas_holdem", status: "live",
      blinds: { sb: 5, bb: 10 }, max_seats: 6,
    }).returning({ id: tables.id })
    tableId = t!.id
    process.env.TURN_BUDGET_MS = "200"
    await ts.registry.loadAll()
  })

  afterEach(async () => {
    delete process.env.TURN_BUDGET_MS
    await ts.cleanup()
  })

  it("auto-folds when agent does not act within budget", async () => {
    const clients = []
    for (let i = 0; i < 2; i++) {
      const c = await createMcpClientWs(ts.wsUrl)
      const { owner_token } = await c.call("register_agent", { name: `bot${i}` })
      c.setOwnerToken(owner_token)
      await c.call("join_table", { table_id: tableId })
      clients.push(c)
    }
    // Just wait — don't call any texas_holdem.* — to trigger timer
    await new Promise((r) => setTimeout(r, 500))
    const rows = await ts.db.select().from(actions)
    const autos = rows.filter((r) => r.kind === "auto_timeout")
    expect(autos.length).toBeGreaterThan(0)
    for (const c of clients) c.close()
  })
})
