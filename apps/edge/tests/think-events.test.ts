import { describe, it, expect } from "vitest"
import { env } from "cloudflare:test"

async function newSession(room: string): Promise<string> {
  const stub = env.TABLE.get(env.TABLE.idFromName(room))
  await stub.fetch(`http://edge/c/${room}/__init`, { method: "POST" })
  const res = await stub.fetch(`http://edge/c/${room}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: {} }),
  })
  return res.headers.get("Mcp-Session-Id")!
}

async function call(room: string, sid: string, name: string, args: any) {
  const stub = env.TABLE.get(env.TABLE.idFromName(room))
  const res = await stub.fetch(`http://edge/c/${room}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Mcp-Session-Id": sid },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  })
  return res.json<any>()
}

async function openWs(room: string): Promise<{ ws: WebSocket; received: any[] }> {
  const stub = env.TABLE.get(env.TABLE.idFromName(room))
  const res = await stub.fetch(`http://edge/c/${room}/ws`, {
    headers: { Upgrade: "websocket" },
  })
  expect(res.status).toBe(101)
  const ws = res.webSocket!
  ws.accept()
  const received: any[] = []
  ws.addEventListener("message", e => {
    try { received.push(JSON.parse(e.data as string)) } catch {}
  })
  await new Promise(r => setTimeout(r, 20))
  return { ws, received }
}

describe("think events", () => {
  it("think tool broadcasts think event", async () => {
    const room = `think-${crypto.randomUUID().slice(0, 6)}`
    const sid = await newSession(room)
    const { received } = await openWs(room)
    await call(room, sid, "sit_down", { name: "A" })
    await call(room, sid, "think", { text: "I'm thinking hard" })
    await new Promise(r => setTimeout(r, 100))
    const think = received.find(e => e.type === "think" && e.text === "I'm thinking hard")
    expect(think).toBeTruthy()
    expect(think.agentId).toBeNull()
  })

  it("act with reasoning emits think before action", async () => {
    const room = `actr-${crypto.randomUUID().slice(0, 6)}`
    const sid = await newSession(room)
    const { received } = await openWs(room)
    await call(room, sid, "sit_down", { name: "A" })

    // Poll get_state until it's our turn, then act with reasoning.
    let acted = false
    for (let i = 0; i < 30 && !acted; i++) {
      await new Promise(r => setTimeout(r, 60))
      const stRes = await call(room, sid, "get_state", {})
      const st = JSON.parse(stRes.result.content[0].text)
      const legal = st.legalActions
      if (Array.isArray(legal) && legal.length > 0) {
        const pick = legal[0]
        const args: any = { action: pick.kind, reasoning: "this is my reasoning xyz" }
        if (pick.kind === "raise") args.amount = pick.min
        const r = await call(room, sid, "act", args)
        if (!r.result?.isError) acted = true
      }
    }
    expect(acted).toBe(true)
    await new Promise(r => setTimeout(r, 100))

    const thinkIdx = received.findIndex(e => e.type === "think" && e.text === "this is my reasoning xyz")
    expect(thinkIdx).toBeGreaterThanOrEqual(0)
    const actionAfter = received.slice(thinkIdx + 1).find(e => e.type === "action")
    expect(actionAfter).toBeTruthy()
  })

  it("bot step emits a think with [RandomBot] template", async () => {
    const room = `bot-${crypto.randomUUID().slice(0, 6)}`
    const sid = await newSession(room)
    const { received } = await openWs(room)
    await call(room, sid, "sit_down", { name: "Human" })
    await new Promise(r => setTimeout(r, 800))
    const botThink = received.find(e => e.type === "think" && e.text.startsWith("[RandomBot]"))
    expect(botThink).toBeTruthy()
  })
})
