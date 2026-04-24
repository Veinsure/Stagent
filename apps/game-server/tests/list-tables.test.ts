import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables } from "@stagent/db-schema"

describe("list_tables", () => {
  let ts: TestServer

  beforeEach(async () => {
    ts = await startTestServer()
    // seed 2 tables
    await ts.db.insert(tables).values([
      { slug: "直播测试1", game_kind: "texas_holdem", status: "live", blinds: { sb: 5, bb: 10 }, max_seats: 6 },
      { slug: "直播测试2", game_kind: "texas_holdem", status: "waiting", blinds: { sb: 5, bb: 10 }, max_seats: 6 },
    ])
    await ts.registry.loadAll()
  })

  afterEach(async () => {
    await ts.cleanup()
  })

  it("returns all tables when no filter", async () => {
    const c = await createMcpClientWs(ts.wsUrl)
    const rows = await c.call("list_tables", {})
    expect(rows).toHaveLength(2)
    expect(rows.map((r: any) => r.slug).sort()).toEqual(["直播测试1", "直播测试2"])
    c.close()
  })

  it("filters by status", async () => {
    const c = await createMcpClientWs(ts.wsUrl)
    const rows = await c.call("list_tables", { status: "live" })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.slug).toBe("直播测试1")
    c.close()
  })
})
