import { describe, it, expect } from "vitest"
import { SELF } from "cloudflare:test"

const J = { "Content-Type": "application/json" }

async function newUser(email: string) {
  const res = await SELF.fetch("https://edge/api/auth/register", {
    method: "POST", headers: J,
    body: JSON.stringify({ email, password: "x1y2z3", display_name: email.split("@")[0] }),
  })
  const cookie = res.headers.get("Set-Cookie")!
  const sid = cookie.match(/stg_sid=([^;]+)/)![1]!
  return { sid, headers: { Cookie: `stg_sid=${sid}`, ...J } }
}

describe("agents-api", () => {
  it("creates an agent and returns one-time token + lists it", async () => {
    const { headers } = await newUser(`a-${crypto.randomUUID()}@x.com`)
    const create = await SELF.fetch("https://edge/api/me/agents", {
      method: "POST", headers,
      body: JSON.stringify({ name: "Aggro-1", description: "fast" }),
    })
    expect(create.status).toBe(200)
    const c = await create.json<{ id: string; name: string; token: string }>()
    expect(c.name).toBe("Aggro-1")
    expect(c.token.startsWith("sk_agent_")).toBe(true)

    const list = await SELF.fetch("https://edge/api/me/agents", { headers })
    const l = await list.json<{ agents: Array<{ id: string; name: string }> }>()
    const found = l.agents.find(a => a.id === c.id)
    expect(found?.name).toBe("Aggro-1")
    expect(JSON.stringify(l)).not.toContain("sk_agent_")
  })

  it("rejects duplicate name within same user", async () => {
    const { headers } = await newUser(`b-${crypto.randomUUID()}@x.com`)
    await SELF.fetch("https://edge/api/me/agents", {
      method: "POST", headers, body: JSON.stringify({ name: "X" }),
    })
    const dup = await SELF.fetch("https://edge/api/me/agents", {
      method: "POST", headers, body: JSON.stringify({ name: "X" }),
    })
    expect(dup.status).toBe(409)
  })

  it("requires session", async () => {
    const res = await SELF.fetch("https://edge/api/me/agents")
    expect(res.status).toBe(401)
  })

  it("rotates token", async () => {
    const { headers } = await newUser(`c-${crypto.randomUUID()}@x.com`)
    const create = await SELF.fetch("https://edge/api/me/agents", {
      method: "POST", headers, body: JSON.stringify({ name: "RotMe" }),
    })
    const c = await create.json<{ id: string; token: string }>()
    const old = c.token

    const rot = await SELF.fetch(`https://edge/api/me/agents/${c.id}/rotate`, {
      method: "POST", headers,
    })
    expect(rot.status).toBe(200)
    const r = await rot.json<{ token: string }>()
    expect(r.token).not.toBe(old)
    expect(r.token.startsWith("sk_agent_")).toBe(true)
  })

  it("deletes agent", async () => {
    const { headers } = await newUser(`d-${crypto.randomUUID()}@x.com`)
    const create = await SELF.fetch("https://edge/api/me/agents", {
      method: "POST", headers, body: JSON.stringify({ name: "DelMe" }),
    })
    const c = await create.json<{ id: string }>()
    const del = await SELF.fetch(`https://edge/api/me/agents/${c.id}`, {
      method: "DELETE", headers,
    })
    expect(del.status).toBe(200)

    const list = await SELF.fetch("https://edge/api/me/agents", { headers })
    const l = await list.json<{ agents: Array<{ id: string }> }>()
    expect(l.agents.find(a => a.id === c.id)).toBeUndefined()
  })

  it("user A cannot delete user B's agent", async () => {
    const a = await newUser(`e1-${crypto.randomUUID()}@x.com`)
    const b = await newUser(`e2-${crypto.randomUUID()}@x.com`)
    const create = await SELF.fetch("https://edge/api/me/agents", {
      method: "POST", headers: a.headers, body: JSON.stringify({ name: "Mine" }),
    })
    const c = await create.json<{ id: string }>()
    const del = await SELF.fetch(`https://edge/api/me/agents/${c.id}`, {
      method: "DELETE", headers: b.headers,
    })
    expect(del.status).toBe(404)
  })
})
