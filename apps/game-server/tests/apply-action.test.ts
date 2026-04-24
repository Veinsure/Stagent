import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables, actions } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("apply_action — fold/check/call", () => {
  let ts: TestServer
  let tableId: string

  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({
      slug: "aa-table", game_kind: "texas_holdem", status: "live",
      blinds: { sb: 5, bb: 10 }, max_seats: 6,
    }).returning({ id: tables.id })
    tableId = t!.id
    await ts.registry.loadAll()
  })

  afterEach(async () => { await ts.cleanup() })

  async function seat3Bots() {
    const clients: any[] = []
    const tokens: string[] = []
    for (let i = 0; i < 3; i++) {
      const c = await createMcpClientWs(ts.wsUrl)
      const { owner_token } = await c.call("register_agent", { name: `bot${i}` })
      c.setOwnerToken(owner_token)
      await c.call("join_table", { table_id: tableId })
      clients.push(c)
      tokens.push(owner_token)
    }
    return { clients, tokens }
  }

  it("call from UTG writes actions row", async () => {
    const { clients } = await seat3Bots()
    // UTG (to_act=0, which is button in 3-handed) = clients[0]
    await clients[0].call("wait_for_my_turn", { table_id: tableId })
    const r = await clients[0].call("texas_holdem.call", {})
    expect(r.ok).toBe(true)
    // DB has action row
    const rows = await ts.db.select().from(actions)
    const callAction = rows.find((x) => x.kind === "call")
    expect(callAction).toBeDefined()
    expect(callAction!.amount).toBe(10)
    for (const c of clients) c.close()
  })

  it("fold marks action row with kind=fold", async () => {
    const { clients } = await seat3Bots()
    await clients[0].call("wait_for_my_turn", { table_id: tableId })
    await clients[0].call("texas_holdem.fold", {})
    const rows = await ts.db.select().from(actions)
    expect(rows.some((x) => x.kind === "fold")).toBe(true)
    for (const c of clients) c.close()
  })
})
