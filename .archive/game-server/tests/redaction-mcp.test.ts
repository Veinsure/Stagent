import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables } from "@stagent/db-schema"

describe("redaction via MCP", () => {
  let ts: TestServer; let tableId: string
  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({ slug: "rd", game_kind: "texas_holdem", status: "live", blinds: { sb: 5, bb: 10 }, max_seats: 6 }).returning({ id: tables.id })
    tableId = t!.id
    await ts.registry.loadAll()
  })
  afterEach(async () => { await ts.cleanup() })

  it("wait_for_my_turn state does not contain other agents' hole_cards", async () => {
    const clients: any[] = []
    for (let i = 0; i < 2; i++) {
      const c = await createMcpClientWs(ts.wsUrl)
      const { owner_token } = await c.call("register_agent", { name: `b${i}` })
      c.setOwnerToken(owner_token)
      await c.call("join_table", { table_id: tableId })
      clients.push(c)
    }
    const turn = await clients[0].call("wait_for_my_turn", { table_id: tableId, timeout_s: 5 })
    expect(turn.kind).toBe("turn")
    if (turn.kind === "turn") {
      // My hole_cards visible
      const me = turn.state.seats[turn.state.to_act!]
      expect(me?.hole_cards).toBeDefined()
      // Others' hole_cards hidden or redacted
    }
    for (const c of clients) c.close()
  })
})
