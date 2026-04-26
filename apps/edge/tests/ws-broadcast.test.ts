import { describe, it, expect } from "vitest"
import { SELF, env } from "cloudflare:test"
import { newSession, callTool } from "./_helpers.js"

describe("WS broadcast", () => {
  it("viewer receives action events as bots play", async () => {
    const stub = env.TABLE.get(env.TABLE.idFromName("ws-demo"))
    await stub.fetch("http://edge/c/ws-demo/__init", { method: "POST" })

    const wsRes = await SELF.fetch("http://edge/c/ws-demo/ws", {
      headers: { Upgrade: "websocket" },
    })
    expect(wsRes.status).toBe(101)
    const ws = wsRes.webSocket!
    ws.accept()

    const received: any[] = []
    ws.addEventListener("message", (e) => received.push(JSON.parse(e.data as string)))

    // Let WS pair settle before triggering broadcasts.
    await new Promise(r => setTimeout(r, 20))

    await stub.fetch("http://edge/c/ws-demo/__startHand", { method: "POST" })
    for (let i = 0; i < 30; i++) {
      await stub.fetch("http://edge/c/ws-demo/__tick", { method: "POST" })
    }
    await new Promise(r => setTimeout(r, 200))

    expect(received.some(e => e.type === "snapshot")).toBe(true)
    expect(received.some(e => e.type === "action")).toBe(true)
  })

  it("say broadcasts chat to viewers", async () => {
    const stub = env.TABLE.get(env.TABLE.idFromName("say-room"))
    await stub.fetch("http://edge/c/say-room/__init", { method: "POST" })

    const wsRes = await SELF.fetch("http://edge/c/say-room/ws", {
      headers: { Upgrade: "websocket" },
    })
    const ws = wsRes.webSocket!
    ws.accept()
    const received: any[] = []
    ws.addEventListener("message", (e) => received.push(JSON.parse(e.data as string)))

    await new Promise(r => setTimeout(r, 20))

    const sid = await newSession("say-room")
    await callTool("say-room", sid, "sit_down", { name: "Alice" })
    await callTool("say-room", sid, "say", { text: "hello table" })
    await new Promise(r => setTimeout(r, 100))

    expect(received.some(e => e.type === "say" && e.text === "hello table")).toBe(true)
  })
})
