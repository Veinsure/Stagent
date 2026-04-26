import { describe, it, expect } from "vitest"
import { SELF, env } from "cloudflare:test"

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
})
