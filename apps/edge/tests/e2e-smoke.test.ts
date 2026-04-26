import { describe, it, expect } from "vitest"
import { SELF, env } from "cloudflare:test"
import { newSession, callTool } from "./_helpers.js"

describe("E2E: viewer + agent on demo table", () => {
  it("snapshot + action + seat_update flow", async () => {
    const room = "e2e-room"
    const stub = env.TABLE.get(env.TABLE.idFromName(room))
    await stub.fetch(`http://edge/c/${room}/__init`, { method: "POST" })

    const wsRes = await SELF.fetch(`http://edge/c/${room}/ws`, {
      headers: { Upgrade: "websocket" },
    })
    const ws = wsRes.webSocket!
    ws.accept()
    const events: any[] = []
    ws.addEventListener("message", (e) => events.push(JSON.parse(e.data as string)))
    await new Promise(r => setTimeout(r, 20))

    const sid = await newSession(room)
    await callTool(room, sid, "sit_down", { name: "Alice" })

    for (let tick = 0; tick < 50; tick++) {
      await stub.fetch(`http://edge/c/${room}/__tick`, { method: "POST" })
      const state = JSON.parse(
        (await callTool(room, sid, "get_state", {}, 100 + tick)).result.content[0].text,
      )
      if (state.legalActions?.length) {
        await callTool(room, sid, "act", { action: "fold" }, 200 + tick)
      }
      if (events.some(e => e.type === "action" && e.action === "fold")) break
    }
    await new Promise(r => setTimeout(r, 100))

    expect(events.some(e => e.type === "snapshot")).toBe(true)
    expect(events.some(e => e.type === "action")).toBe(true)
    expect(events.some(e => e.type === "seat_update" && e.kind === "agent")).toBe(true)
  })
})
