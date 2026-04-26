import { describe, it, expect } from "vitest"
import { SELF } from "cloudflare:test"

describe("MCP Streamable HTTP spike", () => {
  it("handles initialize", async () => {
    const res = await SELF.fetch("http://edge/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("Mcp-Session-Id")).toMatch(/[0-9a-f-]{36}/)
    const body = await res.json<any>()
    expect(body.result.serverInfo.name).toBe("stagent-spike")
  })

  it("lists tools", async () => {
    const res = await SELF.fetch("http://edge/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    })
    const body = await res.json<any>()
    expect(body.result.tools[0].name).toBe("echo")
  })

  it("calls echo", async () => {
    const res = await SELF.fetch("http://edge/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 3, method: "tools/call",
        params: { name: "echo", arguments: { text: "hi" } },
      }),
    })
    const body = await res.json<any>()
    expect(body.result.content[0].text).toBe("hi")
  })
})
