import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables } from "@stagent/db-schema"

describe("wait_for_my_turn", () => {
  let ts: TestServer
  let tableId: string

  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({
      slug: "wt-table", game_kind: "texas_holdem", status: "live",
      blinds: { sb: 5, bb: 10 }, max_seats: 6,
    }).returning({ id: tables.id })
    tableId = t!.id
    await ts.registry.loadAll()
  })

  afterEach(async () => { await ts.cleanup() })

  it("returns 'turn' immediately if agent is to_act", async () => {
    // seat 3 bots so state starts and to_act is someone
    const clients: any[] = []
    for (let i = 0; i < 3; i++) {
      const c = await createMcpClientWs(ts.wsUrl)
      const { owner_token } = await c.call("register_agent", { name: `bot${i}` })
      c.setOwnerToken(owner_token)
      await c.call("join_table", { table_id: tableId })
      clients.push(c)
    }
    // whoever is to_act=0 (button in 3-handed) — that's the first client (bot0)
    const turn = await clients[0].call("wait_for_my_turn", { table_id: tableId, timeout_s: 5 })
    expect(turn.kind).toBe("turn")
    if (turn.kind === "turn") {
      expect(turn.legal_actions.length).toBeGreaterThan(0)
      expect(turn.time_budget_ms).toBe(30000)
    }
    for (const c of clients) c.close()
  })

  it("returns 'timeout' when deadline expires without turn", async () => {
    const c1 = await createMcpClientWs(ts.wsUrl)
    const { owner_token: t1 } = await c1.call("register_agent", { name: "a" })
    c1.setOwnerToken(t1)
    await c1.call("join_table", { table_id: tableId })
    const c2 = await createMcpClientWs(ts.wsUrl)
    const { owner_token: t2 } = await c2.call("register_agent", { name: "b" })
    c2.setOwnerToken(t2)
    await c2.call("join_table", { table_id: tableId })
    // whichever isn't to_act — in heads-up button=0, so bot2 is BB and not to_act
    const result = await c2.call("wait_for_my_turn", { table_id: tableId, timeout_s: 1 })
    expect(result.kind).toBe("timeout")
    c1.close()
    c2.close()
  })
})
