import { describe, it, expect } from "vitest"
import { newSession, callTool } from "./_helpers.js"

describe("sit_down", () => {
  it("first agent claims the open seat (private room: seat 0)", async () => {
    const sid = await newSession("sit-down-room-a")
    const body = await callTool("sit-down-room-a", sid, "sit_down", { name: "Alice" })
    const result = JSON.parse(body.result.content[0].text)
    expect(result.seat).toBe(0)
  })

  it("second agent on same table sits at next open seat", async () => {
    const sid1 = await newSession("sit-down-room-b")
    const r1 = JSON.parse((await callTool("sit-down-room-b", sid1, "sit_down", { name: "Alice" })).result.content[0].text)
    const sid2 = await newSession("sit-down-room-b")
    const body = await callTool("sit-down-room-b", sid2, "sit_down", { name: "Bob" })
    const r2 = JSON.parse(body.result.content[0].text)
    expect(body.result.isError).toBeFalsy()
    expect(r2.seat).toBeGreaterThan(r1.seat)
  })

  it("table full → seat_taken", async () => {
    const room = "sit-down-room-full"
    // private table has 4 open seats (seats 0, 2, 3, 5); fill them all
    for (let i = 0; i < 4; i++) {
      const sid = await newSession(room)
      await callTool(room, sid, "sit_down", { name: `Agent${i}` })
    }
    const sidExtra = await newSession(room)
    const body = await callTool(room, sidExtra, "sit_down", { name: "Extra" })
    expect(body.result.isError).toBe(true)
    expect(body.result.content[0].text).toMatch(/seat_taken/)
  })
})
