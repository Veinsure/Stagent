import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { freshSchema, type FreshSchema } from "./helpers/schema.js"
import { createDbClient } from "../src/db/client.js"
import { createGameServer, listen } from "../src/server.js"
import { createHandler } from "../src/mcp/handler.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { tables } from "@stagent/db-schema"

describe("list_tables", () => {
  let schema: FreshSchema
  let dbClose: () => Promise<void>
  let serverClose: () => Promise<void>
  let wsUrl: string
  let db: ReturnType<typeof createDbClient>["db"]

  beforeEach(async () => {
    schema = await freshSchema()
    const dbc = createDbClient(schema.databaseUrl, schema.schemaName)
    db = dbc.db
    dbClose = dbc.close
    // seed 2 tables
    await db.insert(tables).values([
      { slug: "直播测试1", game_kind: "texas_holdem", status: "live", blinds: { sb: 5, bb: 10 }, max_seats: 6 },
      { slug: "直播测试2", game_kind: "texas_holdem", status: "waiting", blinds: { sb: 5, bb: 10 }, max_seats: 6 },
    ])
    const { server, close } = createGameServer({ handle: createHandler({ db }) })
    await listen(server, 0)
    const addr = server.address()
    const port = typeof addr === "object" && addr ? addr.port : 0
    wsUrl = `ws://localhost:${port}/mcp`
    serverClose = close
  })

  afterEach(async () => {
    await serverClose(); await dbClose(); await schema.cleanup()
  })

  it("returns all tables when no filter", async () => {
    const c = await createMcpClientWs(wsUrl)
    const rows = await c.call("list_tables", {})
    expect(rows).toHaveLength(2)
    expect(rows.map((r: any) => r.slug).sort()).toEqual(["直播测试1", "直播测试2"])
    c.close()
  })

  it("filters by status", async () => {
    const c = await createMcpClientWs(wsUrl)
    const rows = await c.call("list_tables", { status: "live" })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.slug).toBe("直播测试1")
    c.close()
  })
})
