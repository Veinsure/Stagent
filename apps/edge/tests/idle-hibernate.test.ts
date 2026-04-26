import { describe, it, expect } from "vitest"
import { env, runInDurableObject } from "cloudflare:test"
import type { TableDO } from "../src/do-table.js"
import { IDLE_HIBERNATE_MS } from "../src/config.js"

describe("idle hibernation", () => {
  it("clears state after 5min idle; next access is fresh", async () => {
    const stub = env.TABLE.get(env.TABLE.idFromName("idle-room"))
    await stub.fetch("http://edge/c/idle-room/__init", { method: "POST" })
    await stub.fetch("http://edge/c/idle-room/__startHand", { method: "POST" })
    for (let i = 0; i < 10; i++) {
      await stub.fetch("http://edge/c/idle-room/__tick", { method: "POST" })
    }

    await runInDurableObject(stub, async (obj: TableDO) => {
      const s = await obj.readState()
      s.lastActivityMs = Date.now() - IDLE_HIBERNATE_MS - 1000
      await obj.writeState(s)
    })
    await stub.fetch("http://edge/c/idle-room/__checkIdle", { method: "POST" })

    await stub.fetch("http://edge/c/idle-room/__init", { method: "POST" })
    await runInDurableObject(stub, async (obj: TableDO) => {
      const s = await obj.readState()
      expect(s.handsPlayed).toBe(0)
      expect(s.engine).toBeNull()
    })
  })
})
