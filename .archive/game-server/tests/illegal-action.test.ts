import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables, actions } from "@stagent/db-schema"

describe("illegal-action audit", () => {
  let ts: TestServer; let tableId: string
  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({ slug: "ia", game_kind: "texas_holdem", status: "live", blinds: { sb: 5, bb: 10 }, max_seats: 6 }).returning({ id: tables.id })
    tableId = t!.id
    await ts.registry.loadAll()
  })
  afterEach(async () => { await ts.cleanup() })

  it("check with bet outstanding is rejected and logged as kind=illegal", async () => {
    const clients: any[] = []
    for (let i = 0; i < 2; i++) {
      const c = await createMcpClientWs(ts.wsUrl)
      const { owner_token } = await c.call("register_agent", { name: `b${i}` })
      c.setOwnerToken(owner_token)
      await c.call("join_table", { table_id: tableId })
      clients.push(c)
    }
    // whichever is to_act=0, call check illegally (current_bet=10)
    const turn = await clients[0].call("wait_for_my_turn", { table_id: tableId, timeout_s: 5 })
    expect(turn.kind).toBe("turn")
    await expect(clients[0].call("texas_holdem.check", {})).rejects.toThrow(/illegal_action/)
    const rows = await ts.db.select().from(actions)
    expect(rows.some((r) => r.kind === "illegal")).toBe(true)
    for (const c of clients) c.close()
  })
})
