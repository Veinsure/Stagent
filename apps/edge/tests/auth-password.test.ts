import { describe, it, expect } from "vitest"
import { hashPassword, verifyPassword } from "../src/auth/password.js"

describe("password", () => {
  it("hashes then verifies the same password", async () => {
    const hash = await hashPassword("hunter2")
    expect(hash.startsWith("$2")).toBe(true)
    expect(await verifyPassword("hunter2", hash)).toBe(true)
  })

  it("rejects wrong password", async () => {
    const hash = await hashPassword("hunter2")
    expect(await verifyPassword("hunter3", hash)).toBe(false)
  })
})
