import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "./helpers/server.js"
import { createMcpClientWs } from "@stagent/mcp-tools"
import { agents } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("register_agent", () => {
  let ts: TestServer

  beforeEach(async () => {
    ts = await startTestServer()
  })

  afterEach(async () => {
    await ts.cleanup()
  })

  it("inserts a new agent and returns owner_token", async () => {
    const client = await createMcpClientWs(ts.wsUrl)
    const { agent_id, owner_token } = await client.call("register_agent", { name: "bot-1" })
    expect(agent_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(owner_token).toHaveLength(64)    // 32 bytes hex
    const rows = await ts.db.select().from(agents).where(eq(agents.id, agent_id))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.name).toBe("bot-1")
    client.close()
  })

  it("allows same name to register twice (different agents)", async () => {
    const c1 = await createMcpClientWs(ts.wsUrl)
    const r1 = await c1.call("register_agent", { name: "dup" })
    c1.close()
    const c2 = await createMcpClientWs(ts.wsUrl)
    const r2 = await c2.call("register_agent", { name: "dup" })
    c2.close()
    expect(r1.agent_id).not.toBe(r2.agent_id)
  })
})
