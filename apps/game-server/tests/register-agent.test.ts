import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { freshSchema, type FreshSchema } from "./helpers/schema.js"
import { createDbClient } from "../src/db/client.js"
import { createGameServer, listen } from "../src/server.js"
import { createHandler } from "../src/mcp/handler.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { agents } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("register_agent", () => {
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
    const { server, close } = createGameServer({
      handle: createHandler({ db }),
    })
    await listen(server, 0)
    const addr = server.address()
    const port = typeof addr === "object" && addr ? addr.port : 0
    wsUrl = `ws://localhost:${port}/mcp`
    serverClose = close
  })

  afterEach(async () => {
    await serverClose()
    await dbClose()
    await schema.cleanup()
  })

  it("inserts a new agent and returns owner_token", async () => {
    const client = await createMcpClientWs(wsUrl)
    const { agent_id, owner_token } = await client.call("register_agent", { name: "bot-1" })
    expect(agent_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(owner_token).toHaveLength(64)    // 32 bytes hex
    const rows = await db.select().from(agents).where(eq(agents.id, agent_id))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.name).toBe("bot-1")
    client.close()
  })

  it("allows same name to register twice (different agents)", async () => {
    const c1 = await createMcpClientWs(wsUrl)
    const r1 = await c1.call("register_agent", { name: "dup" })
    c1.close()
    const c2 = await createMcpClientWs(wsUrl)
    const r2 = await c2.call("register_agent", { name: "dup" })
    c2.close()
    expect(r1.agent_id).not.toBe(r2.agent_id)
  })
})
