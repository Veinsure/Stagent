import { describe, it, expect } from "vitest"
import { newSession, callTool } from "./_helpers.js"

describe("get_state", () => {
  it("agent sees own hole_cards, others hidden", async () => {
    const sid = await newSession("get-state-room")
    await callTool("get-state-room", sid, "sit_down", { name: "Alice" })
    const body = await callTool("get-state-room", sid, "get_state", {})
    const result = JSON.parse(body.result.content[0].text)
    expect(Array.isArray(result.holeCards)).toBe(true)
    expect(result.holeCards).toHaveLength(2)

    const aliceEntry = result.engine.seats.find((x: any) => x.agent_id.includes("Alice"))
    expect(aliceEntry).toBeDefined()
    for (const es of result.engine.seats) {
      if (es.agent_id !== aliceEntry.agent_id) {
        expect(es.hole_cards).toBeUndefined()
      }
    }
  })
})
