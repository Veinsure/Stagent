import { describe, it, expect } from "vitest"
import { env } from "cloudflare:test"
import { newSession, callTool } from "./_helpers.js"

describe("act", () => {
  it("acting before sitting returns not_seated", async () => {
    const sid = await newSession("act-room-a")
    const body = await callTool("act-room-a", sid, "act", { action: "fold" })
    expect(body.result.isError).toBe(true)
  })

  it("folding on own turn advances the hand", async () => {
    const sid = await newSession("act-room-b")
    await callTool("act-room-b", sid, "sit_down", { name: "Alice" })
    const stub = env.TABLE.get(env.TABLE.idFromName("act-room-b"))

    for (let i = 0; i < 30; i++) {
      await stub.fetch(`http://edge/c/act-room-b/__tick`, { method: "POST" })
      const s = JSON.parse(
        (await callTool("act-room-b", sid, "get_state", {}, i + 100)).result.content[0].text,
      )
      if (s.legalActions?.length) {
        const body = await callTool("act-room-b", sid, "act", { action: "fold" }, 999)
        expect(body.result.isError).toBeFalsy()
        return
      }
    }
    throw new Error("never got a turn within 30 ticks")
  })
})
