import { describe, it, expect } from "vitest"
import {
  generateSessionToken,
  hashSessionToken,
  serializeSessionCookie,
  parseSessionCookie,
  SESSION_COOKIE,
} from "../src/auth/session.js"
import { optionalSession } from "../src/auth/middleware.js"
import { env, SELF } from "cloudflare:test"

describe("session", () => {
  it("generates a 43+ char base64url token", () => {
    const t = generateSessionToken()
    expect(t.length).toBeGreaterThanOrEqual(43)
    expect(/^[A-Za-z0-9_-]+$/.test(t)).toBe(true)
  })

  it("hashes deterministically", () => {
    const t = generateSessionToken()
    expect(hashSessionToken(t)).toBe(hashSessionToken(t))
    expect(hashSessionToken(t)).not.toBe(t)
  })

  it("serializes a Set-Cookie header", () => {
    const c = serializeSessionCookie("abc", { maxAgeSec: 3600 })
    expect(c).toContain(`${SESSION_COOKIE}=abc`)
    expect(c).toContain("HttpOnly")
    expect(c).toContain("Secure")
    expect(c).toContain("SameSite=Lax")
    expect(c).toContain("Max-Age=3600")
    expect(c).toContain("Path=/")
  })

  it("parses cookie header", () => {
    const headers = new Headers({ Cookie: `other=x; ${SESSION_COOKIE}=mytoken; foo=bar` })
    expect(parseSessionCookie(headers)).toBe("mytoken")
  })

  it("returns null when cookie missing", () => {
    expect(parseSessionCookie(new Headers())).toBeNull()
  })
})

describe("optionalSession", () => {
  it("returns null when no cookie present", async () => {
    const req = new Request("https://edge/x")
    const res = await optionalSession(req, env)
    expect(res).toBeNull()
  })

  it("returns null when cookie token is unknown", async () => {
    const req = new Request("https://edge/x", { headers: { Cookie: "stg_sid=garbage" } })
    const res = await optionalSession(req, env)
    expect(res).toBeNull()
  })

  it("returns user when cookie is a live session", async () => {
    const dn = `OptU-${crypto.randomUUID().slice(0, 6)}`
    const reg = await SELF.fetch("https://edge/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${dn}@x.com`, password: "x1y2z3", display_name: dn }),
    })
    const setCookie = reg.headers.get("Set-Cookie")!
    const sid = setCookie.match(/stg_sid=([^;]+)/)![1]!
    const req = new Request("https://edge/x", { headers: { Cookie: `stg_sid=${sid}` } })
    const res = await optionalSession(req, env)
    expect(res).not.toBeNull()
    expect(res!.displayName).toBe(dn)
  })
})
