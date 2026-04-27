import { describe, it, expect } from "vitest"
import { env, SELF } from "cloudflare:test"

const J = { "Content-Type": "application/json" }

async function makeUserWithAgent(email: string, agentName: string) {
  const reg = await SELF.fetch("https://edge/api/auth/register", {
    method: "POST", headers: J,
    body: JSON.stringify({ email, password: "x1y2z3", display_name: email.split("@")[0] }),
  })
  const sid = reg.headers.get("Set-Cookie")!.match(/stg_sid=([^;]+)/)![1]!
  const create = await SELF.fetch("https://edge/api/me/agents", {
    method: "POST",
    headers: { Cookie: `stg_sid=${sid}`, ...J },
    body: JSON.stringify({ name: agentName }),
  })
  const c = await create.json<{ id: string; token: string }>()
  return { agentId: c.id, token: c.token }
}

async function mcpInit(room: string, token?: string): Promise<{ sid: string }> {
  const stub = env.TABLE.get(env.TABLE.idFromName(room))
  await stub.fetch(`http://edge/c/${room}/__init`, { method: "POST" })
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await stub.fetch(`http://edge/c/${room}/mcp`, {
    method: "POST", headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: {} }),
  })
  return { sid: res.headers.get("Mcp-Session-Id")! }
}

async function mcpCall(room: string, sid: string, name: string, args: any, token?: string) {
  const stub = env.TABLE.get(env.TABLE.idFromName(room))
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Mcp-Session-Id": sid,
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await stub.fetch(`http://edge/c/${room}/mcp`, {
    method: "POST", headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  })
  return res.json<any>()
}

describe("bearer mcp", () => {
  it("authenticated sit_down uses agent profile name", async () => {
    const room = `t-bearer-${crypto.randomUUID().slice(0, 6)}`
    const { token } = await makeUserWithAgent(`x-${crypto.randomUUID()}@x.com`, "MyClaude")
    const { sid } = await mcpInit(room, token)
    const res = await mcpCall(room, sid, "sit_down", { name: "ignored-fallback" }, token)
    expect(res.result.content[0].text).toContain('"seat":0')
  })

  it("anonymous sit_down uses provided fallback name", async () => {
    const room = `t-anon-${crypto.randomUUID().slice(0, 6)}`
    const { sid } = await mcpInit(room)
    const res = await mcpCall(room, sid, "sit_down", { name: "Anon-1" })
    expect(res.result.content[0].text).toContain('"seat":0')
  })

  it("invalid bearer is treated as anonymous (does not 401 on sit_down)", async () => {
    const room = `t-badtok-${crypto.randomUUID().slice(0, 6)}`
    const bad = "sk_agent_invalidtoken1234567890ab"
    const { sid } = await mcpInit(room, bad)
    const res = await mcpCall(room, sid, "sit_down", { name: "Anon" }, bad)
    expect(res.result.content[0].text).toContain('"seat":0')
  })
})
