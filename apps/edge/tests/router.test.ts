import { describe, it, expect } from "vitest"
import { SELF } from "cloudflare:test"

describe("Worker router", () => {
  it("404 on unknown path", async () => {
    const res = await SELF.fetch("http://edge/nope")
    expect(res.status).toBe(404)
  })

  it("routes /c/router-test-mcp/mcp POST to DO", async () => {
    const res = await SELF.fetch("http://edge/c/router-test-mcp/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    })
    // Routed (not 404) — actual MCP handler implemented in Task 11.
    expect(res.status).not.toBe(404)
  })

  it("rejects invalid room id", async () => {
    const res = await SELF.fetch("http://edge/c/BAD!!/mcp", { method: "POST", body: "{}" })
    expect(res.status).toBe(400)
  })

  it("routes /api/tables POST", async () => {
    const res = await SELF.fetch("http://edge/api/tables", { method: "POST" })
    expect(res.status).not.toBe(404)
  })
})
