import { describe, it, expect } from "vitest"
import { env, SELF } from "cloudflare:test"
import { putPresence } from "../src/presence.js"

const J = { "Content-Type": "application/json" }

describe("users-api", () => {
  it("returns public profile + empty live array when no presence", async () => {
    const dn = `Frank-${crypto.randomUUID().slice(0, 6)}`
    const reg = await SELF.fetch("https://edge/api/auth/register", {
      method: "POST", headers: J,
      body: JSON.stringify({ email: `u-${crypto.randomUUID()}@x.com`, password: "x1y2z3", display_name: dn }),
    })
    expect(reg.status).toBe(200)
    const get = await SELF.fetch(`https://edge/api/users/${dn}`)
    expect(get.status).toBe(200)
    const body = await get.json<{ user: { display_name: string }; live: any[] }>()
    expect(body.user.display_name).toBe(dn)
    expect(body.live).toEqual([])
  })

  it("returns live array when presence is set", async () => {
    const dn = `Live-${crypto.randomUUID().slice(0, 6)}`
    const reg = await SELF.fetch("https://edge/api/auth/register", {
      method: "POST", headers: J,
      body: JSON.stringify({ email: `${dn}@x.com`, password: "x1y2z3", display_name: dn }),
    })
    const u = await reg.json<{ user: { id: string } }>()
    await putPresence(env.PRESENCE, u.user.id, "agent-abc", {
      room: "demo-1", sinceTs: 100, agentName: "MyClaude",
    })
    const get = await SELF.fetch(`https://edge/api/users/${dn}`)
    const body = await get.json<{ live: Array<{ agent_name: string; room: string }> }>()
    expect(body.live).toHaveLength(1)
    expect(body.live[0]!.room).toBe("demo-1")
    expect(body.live[0]!.agent_name).toBe("MyClaude")
  })

  it("404 for unknown user", async () => {
    const res = await SELF.fetch("https://edge/api/users/no-such-person")
    expect(res.status).toBe(404)
  })
})

describe("users-api: follow status", () => {
  it("anonymous request: is_following=false, followers_count reflects total", async () => {
    const target = `Tgt-${crypto.randomUUID().slice(0, 6)}`
    await SELF.fetch("https://edge/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${target}@x.com`, password: "x1y2z3", display_name: target }),
    })
    const res = await SELF.fetch(`https://edge/api/users/${target}`)
    const body = await res.json<{ is_following: boolean; followers_count: number }>()
    expect(body.is_following).toBe(false)
    expect(typeof body.followers_count).toBe("number")
  })

  it("logged-in viewer that follows target: is_following=true and followers_count >= 1", async () => {
    const target = `Tgt2-${crypto.randomUUID().slice(0, 6)}`
    const reg1 = await SELF.fetch("https://edge/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${target}@x.com`, password: "x1y2z3", display_name: target }),
    })
    expect(reg1.status).toBe(200)

    const me = `Me-${crypto.randomUUID().slice(0, 6)}`
    const reg2 = await SELF.fetch("https://edge/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${me}@x.com`, password: "x1y2z3", display_name: me }),
    })
    const sid = reg2.headers.get("Set-Cookie")!.match(/stg_sid=([^;]+)/)![1]!
    const cookie = `stg_sid=${sid}`

    await SELF.fetch(`https://edge/api/users/${target}/follow`, { method: "POST", headers: { Cookie: cookie } })

    const res = await SELF.fetch(`https://edge/api/users/${target}`, { headers: { Cookie: cookie } })
    const body = await res.json<{ is_following: boolean; followers_count: number }>()
    expect(body.is_following).toBe(true)
    expect(body.followers_count).toBeGreaterThanOrEqual(1)
  })

  it("logged-in viewer who does NOT follow target: is_following=false", async () => {
    const target = `Tgt3-${crypto.randomUUID().slice(0, 6)}`
    await SELF.fetch("https://edge/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${target}@x.com`, password: "x1y2z3", display_name: target }),
    })
    const me = `Me2-${crypto.randomUUID().slice(0, 6)}`
    const reg = await SELF.fetch("https://edge/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${me}@x.com`, password: "x1y2z3", display_name: me }),
    })
    const sid = reg.headers.get("Set-Cookie")!.match(/stg_sid=([^;]+)/)![1]!
    const res = await SELF.fetch(`https://edge/api/users/${target}`, { headers: { Cookie: `stg_sid=${sid}` } })
    const body = await res.json<{ is_following: boolean }>()
    expect(body.is_following).toBe(false)
  })
})
