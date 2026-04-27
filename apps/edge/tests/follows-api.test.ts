import { describe, it, expect } from "vitest"
import { SELF } from "cloudflare:test"

const J = { "Content-Type": "application/json" }

async function registerAndCookie(): Promise<{ name: string; cookie: string }> {
  const dn = `Fol-${crypto.randomUUID().slice(0, 6)}`
  const reg = await SELF.fetch("https://edge/api/auth/register", {
    method: "POST", headers: J,
    body: JSON.stringify({ email: `${dn}@x.com`, password: "x1y2z3", display_name: dn }),
  })
  expect(reg.status).toBe(200)
  const sid = reg.headers.get("Set-Cookie")!.match(/stg_sid=([^;]+)/)![1]!
  return { name: dn, cookie: `stg_sid=${sid}` }
}

describe("POST /api/users/[name]/follow", () => {
  it("401 when not logged in", async () => {
    const res = await SELF.fetch("https://edge/api/users/anyone/follow", { method: "POST" })
    expect(res.status).toBe(401)
  })

  it("400 when following self", async () => {
    const me = await registerAndCookie()
    const res = await SELF.fetch(`https://edge/api/users/${me.name}/follow`, {
      method: "POST", headers: { Cookie: me.cookie },
    })
    expect(res.status).toBe(400)
  })

  it("404 when followee does not exist", async () => {
    const me = await registerAndCookie()
    const res = await SELF.fetch("https://edge/api/users/no-such-user/follow", {
      method: "POST", headers: { Cookie: me.cookie },
    })
    expect(res.status).toBe(404)
  })

  it("201 on first follow, 200 on duplicate (idempotent)", async () => {
    const me = await registerAndCookie()
    const them = await registerAndCookie()
    const r1 = await SELF.fetch(`https://edge/api/users/${them.name}/follow`, {
      method: "POST", headers: { Cookie: me.cookie },
    })
    expect(r1.status).toBe(201)
    const r2 = await SELF.fetch(`https://edge/api/users/${them.name}/follow`, {
      method: "POST", headers: { Cookie: me.cookie },
    })
    expect(r2.status).toBe(200)
  })
})
