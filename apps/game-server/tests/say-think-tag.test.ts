import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables, actions } from "@stagent/db-schema"

describe("say / think / tag", () => {
  let ts: TestServer
  let tableId: string

  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({
      slug: "st-table", game_kind: "texas_holdem", status: "live",
      blinds: { sb: 5, bb: 10 }, max_seats: 6,
    }).returning({ id: tables.id })
    tableId = t!.id
    await ts.registry.loadAll()
  })

  afterEach(async () => { await ts.cleanup() })

  it("think writes actions row with thought_private=true", async () => {
    const c = await createMcpClientWs(ts.wsUrl)
    const { owner_token } = await c.call("register_agent", { name: "bot" })
    c.setOwnerToken(owner_token)
    await c.call("join_table", { table_id: tableId })
    // Need another seat so the hand starts (createTable needs >= 2)
    const c2 = await createMcpClientWs(ts.wsUrl)
    const { owner_token: t2 } = await c2.call("register_agent", { name: "bot2" })
    c2.setOwnerToken(t2)
    await c2.call("join_table", { table_id: tableId })

    await c.call("think", { text: "评估胜率..." })
    const rows = await ts.db.select().from(actions)
    const think = rows.find((r) => r.kind === "think")
    expect(think).toBeDefined()
    expect(think!.thought_private).toBe(true)
    expect(think!.text).toBe("评估胜率...")
    c.close()
    c2.close()
  })

  it("say writes actions row with thought_private=false", async () => {
    const c = await createMcpClientWs(ts.wsUrl)
    const { owner_token } = await c.call("register_agent", { name: "bot" })
    c.setOwnerToken(owner_token)
    await c.call("join_table", { table_id: tableId })
    const c2 = await createMcpClientWs(ts.wsUrl)
    const { owner_token: t2 } = await c2.call("register_agent", { name: "bot2" })
    c2.setOwnerToken(t2)
    await c2.call("join_table", { table_id: tableId })

    await c.call("say", { text: "good luck" })
    const rows = await ts.db.select().from(actions)
    const say = rows.find((r) => r.kind === "say")
    expect(say).toBeDefined()
    expect(say!.thought_private).toBe(false)
    c.close()
    c2.close()
  })
})
