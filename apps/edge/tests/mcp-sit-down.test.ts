import { describe, it, expect } from "vitest"
import { newSession, callTool } from "./_helpers.js"

describe("sit_down", () => {
  it("first agent claims the open seat (private room: seat 0)", async () => {
    const sid = await newSession("sit-down-room-a")
    const body = await callTool("sit-down-room-a", sid, "sit_down", { name: "Alice" })
    const result = JSON.parse(body.result.content[0].text)
    expect(result.seat).toBe(0)
  })

  it("second agent on same table gets seat_taken", async () => {
    const sid1 = await newSession("sit-down-room-b")
    await callTool("sit-down-room-b", sid1, "sit_down", { name: "Alice" })
    const sid2 = await newSession("sit-down-room-b")
    const body = await callTool("sit-down-room-b", sid2, "sit_down", { name: "Bob" })
    expect(body.result.isError).toBe(true)
    expect(body.result.content[0].text).toMatch(/seat_taken/)
  })
})
