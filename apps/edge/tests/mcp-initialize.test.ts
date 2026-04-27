import { describe, it, expect } from "vitest"
import { env } from "cloudflare:test"

async function rpc(room: string, body: any, sid?: string): Promise<{ headers: Headers; body: any }> {
  const stub = env.TABLE.get(env.TABLE.idFromName(room))
  await stub.fetch(`http://edge/c/${room}/__init`, { method: "POST" })
  const res = await stub.fetch(`http://edge/c/${room}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(sid ? { "Mcp-Session-Id": sid } : {}) },
    body: JSON.stringify(body),
  })
  return { headers: res.headers, body: await res.json<any>() }
}

describe("MCP initialize + tools/list", () => {
  it("initialize returns session id", async () => {
    const { headers, body } = await rpc("mcp-init-room", {
      jsonrpc: "2.0", id: 1, method: "initialize", params: {},
    })
    expect(headers.get("Mcp-Session-Id")).toMatch(/[0-9a-f-]{36}/)
    expect(body.result.serverInfo.name).toBe("stagent")
  })

  it("tools/list returns 5 V3 tools", async () => {
    const { body } = await rpc("mcp-init-room", {
      jsonrpc: "2.0", id: 2, method: "tools/list", params: {},
    })
    const names = body.result.tools.map((t: any) => t.name)
    expect(names).toEqual(["sit_down", "get_state", "act", "say", "think"])
  })
})
