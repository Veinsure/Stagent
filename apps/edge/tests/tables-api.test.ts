import { describe, it, expect } from "vitest"
import { SELF } from "cloudflare:test"

describe("POST /api/tables", () => {
  it("creates a private table and returns URLs", async () => {
    const res = await SELF.fetch("http://edge/api/tables", { method: "POST" })
    expect(res.status).toBe(201)
    const body = await res.json<any>()
    expect(body.mcpUrl).toMatch(/\/c\/prv-[a-z0-9]+\/mcp\?t=[a-z0-9]+/)
    expect(body.watchUrl).toMatch(/\/c\/prv-[a-z0-9]+$/)
  })

  it("private mcp requires valid token", async () => {
    const create = await SELF.fetch("http://edge/api/tables", { method: "POST" })
    const { mcpUrl } = await create.json<any>()
    const badUrl = mcpUrl.replace(/t=[a-z0-9]+/, "t=wrong")
    const res = await SELF.fetch(badUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    })
    expect(res.status).toBe(403)
  })
})
