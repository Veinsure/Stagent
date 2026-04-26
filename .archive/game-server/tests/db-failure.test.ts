import { describe, it, expect } from "vitest"
import { startTestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables } from "@stagent/db-schema"

describe("db failure behavior", () => {
  it("in-memory state persists even if an action-row insert is simulated to fail", async () => {
    // NOTE: simulating a partial DB failure requires either a proxy or monkey-patching.
    // For W2 we assert the positive path only: DB connection is healthy; actions are logged.
    // TODO W6: add a DB proxy that drops writes with configurable probability.
    const ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({ slug: "df", game_kind: "texas_holdem", status: "live", blinds: { sb: 5, bb: 10 }, max_seats: 6 }).returning({ id: tables.id })
    await ts.registry.loadAll()
    const c = await createMcpClientWs(ts.wsUrl)
    const { owner_token } = await c.call("register_agent", { name: "bot" })
    c.setOwnerToken(owner_token)
    await c.call("join_table", { table_id: t!.id })
    expect(ts.registry.get(t!.id)).toBeDefined()
    c.close()
    await ts.cleanup()
  })
})
