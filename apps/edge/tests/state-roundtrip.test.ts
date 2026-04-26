import { describe, it, expect } from "vitest"
import { env, runInDurableObject } from "cloudflare:test"
import type { TableDO } from "../src/do-table.js"

describe("DOState persistence", () => {
  it("round-trips state through ctx.storage", async () => {
    const stub = env.TABLE.get(env.TABLE.idFromName("roundtrip-1"))
    await stub.fetch("http://edge/c/roundtrip-1/__init", { method: "POST" })

    await runInDurableObject(stub, async (obj: TableDO) => {
      const st = await obj.readState()
      st.handsPlayed = 42
      await obj.writeState(st)
    })

    await runInDurableObject(stub, async (obj: TableDO) => {
      obj.dropCachedState()
      await obj.ensureState("roundtrip-1")
      const st = await obj.readState()
      expect(st.handsPlayed).toBe(42)
    })
  })
})
