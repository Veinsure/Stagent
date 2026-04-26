import { describe, it, expect } from "vitest"
import { env, runInDurableObject } from "cloudflare:test"
import type { TableDO } from "../src/do-table.js"
import { STARTING_CHIPS, AGENT_GRACE_MS } from "../src/config.js"

describe("agent disconnect", () => {
  it("30s idle → demo seat becomes empty", async () => {
    const stub = env.TABLE.get(env.TABLE.idFromName("disco-demo"))
    await stub.fetch("http://edge/c/disco-demo/__init", { method: "POST" })

    await runInDurableObject(stub, async (obj: TableDO) => {
      const s = await obj.readState()
      // disco-demo is treated as private (only demo-1/2/3 are demo rooms),
      // so simulate the demo behaviour by overwriting kind too.
      s.kind = "demo"
      s.seats[3] = {
        kind: "agent", name: "Ghost", chips: STARTING_CHIPS,
        mcpSessionId: "dead", lastSeenMs: Date.now() - AGENT_GRACE_MS - 1000,
      }
      await obj.writeState(s)
    })

    await stub.fetch("http://edge/c/disco-demo/__reapIdle", { method: "POST" })

    await runInDurableObject(stub, async (obj: TableDO) => {
      const s = await obj.readState()
      expect(s.seats[3]!.kind).toBe("empty")
    })
  })

  it("30s idle → private seat becomes RandomBot", async () => {
    const stub = env.TABLE.get(env.TABLE.idFromName("disco-priv"))
    await stub.fetch("http://edge/c/disco-priv/__initPrivate", {
      method: "POST", headers: { "X-Owner-Token": "t" },
    })
    await runInDurableObject(stub, async (obj: TableDO) => {
      const s = await obj.readState()
      s.seats[0] = {
        kind: "agent", name: "Ghost", chips: STARTING_CHIPS,
        mcpSessionId: "dead", lastSeenMs: Date.now() - AGENT_GRACE_MS - 1000,
      }
      await obj.writeState(s)
    })
    await stub.fetch("http://edge/c/disco-priv/__reapIdle", { method: "POST" })
    await runInDurableObject(stub, async (obj: TableDO) => {
      const s = await obj.readState()
      expect(s.seats[0]!.kind).toBe("bot")
    })
  })
})
