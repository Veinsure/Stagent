import { describe, it, expect } from "vitest"
import {
  generateSessionToken,
  hashSessionToken,
  serializeSessionCookie,
  parseSessionCookie,
  SESSION_COOKIE,
} from "../src/auth/session.js"

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
