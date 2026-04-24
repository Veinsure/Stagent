import { describe, it, expect } from "vitest"
import { Actor } from "../src/actor.js"

class CounterActor extends Actor<"inc" | "get", number> {
  private count = 0
  async handle(cmd: "inc" | "get"): Promise<number> {
    if (cmd === "inc") this.count++
    return this.count
  }
}

describe("Actor", () => {
  it("processes commands in order (serial)", async () => {
    const a = new CounterActor()
    const running = a.start()
    await a.enqueue("inc")
    await a.enqueue("inc")
    await a.enqueue("inc")
    expect(await a.enqueue("get")).toBe(3)
    await a.stop()
    await running
  })

  it("handles 100 concurrent enqueues serially", async () => {
    const a = new CounterActor()
    const running = a.start()
    const promises = Array.from({ length: 100 }, () => a.enqueue("inc"))
    const values = await Promise.all(promises)
    // Each enqueue returns the count at its turn; last must be 100
    expect(Math.max(...values)).toBe(100)
    expect(values).toEqual([...values].sort((x, y) => x - y))    // monotonically increasing
    await a.stop()
    await running
  })

  it("handler exception rejects enqueue but does not crash actor", async () => {
    class FlakyActor extends Actor<"ok" | "boom", string> {
      async handle(cmd: "ok" | "boom"): Promise<string> {
        if (cmd === "boom") throw new Error("oops")
        return "ok"
      }
    }
    const a = new FlakyActor()
    const running = a.start()
    await expect(a.enqueue("boom")).rejects.toThrow("oops")
    expect(await a.enqueue("ok")).toBe("ok")
    await a.stop()
    await running
  })

  it("stop is idempotent", async () => {
    const a = new CounterActor()
    const running = a.start()
    await a.stop()
    await a.stop()                // second call must not throw
    await running
  })

  it("enqueue after stop rejects", async () => {
    const a = new CounterActor()
    const running = a.start()
    await a.stop()
    await running
    await expect(a.enqueue("inc")).rejects.toThrow()
  })
})
