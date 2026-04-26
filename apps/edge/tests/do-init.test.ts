import { describe, it, expect } from "vitest"
import { env, runInDurableObject } from "cloudflare:test"
import type { TableDO } from "../src/do-table.js"

describe("DO initialization", () => {
  it("demo room has 3 bots + 1 open seat", async () => {
    const stub = env.TABLE.get(env.TABLE.idFromName("demo-1"))
    await stub.fetch("http://edge/c/demo-1/__init", { method: "POST" })

    await runInDurableObject(stub, async (obj: TableDO) => {
      const st = await obj.readState()
      expect(st.kind).toBe("demo")
      expect(st.seats.length).toBe(4)
      expect(st.seats.filter((s) => s.kind === "bot").length).toBe(3)
      expect(st.seats.filter((s) => s.kind === "empty").length).toBe(1)
      expect(st.seats[3]!.kind).toBe("empty")
    })
  })

  it("unknown room id initialized as private", async () => {
    const stub = env.TABLE.get(env.TABLE.idFromName("prv-xyz123"))
    await stub.fetch("http://edge/c/prv-xyz123/__init", { method: "POST" })

    await runInDurableObject(stub, async (obj: TableDO) => {
      const st = await obj.readState()
      expect(st.kind).toBe("private")
      expect(st.seats.filter((s) => s.kind === "bot").length).toBe(3)
      expect(st.seats[0]!.kind).toBe("empty")
    })
  })
})
