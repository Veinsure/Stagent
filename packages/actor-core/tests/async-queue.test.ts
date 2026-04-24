import { describe, it, expect } from "vitest"
import { AsyncQueue, QueueClosedError } from "../src/async-queue.js"

describe("AsyncQueue", () => {
  it("push + pop preserves FIFO order", async () => {
    const q = new AsyncQueue<number>()
    q.push(1); q.push(2); q.push(3)
    expect(await q.pop()).toBe(1)
    expect(await q.pop()).toBe(2)
    expect(await q.pop()).toBe(3)
  })

  it("pop on empty queue suspends until push", async () => {
    const q = new AsyncQueue<string>()
    const popped = q.pop()
    let resolved = false
    popped.then(() => { resolved = true })
    await new Promise((r) => setTimeout(r, 10))
    expect(resolved).toBe(false)
    q.push("hello")
    expect(await popped).toBe("hello")
  })

  it("multiple pending pops resolve in FIFO on push", async () => {
    const q = new AsyncQueue<number>()
    const p1 = q.pop()
    const p2 = q.pop()
    q.push(1); q.push(2)
    expect(await p1).toBe(1)
    expect(await p2).toBe(2)
  })

  it("close rejects pending pops with QueueClosedError", async () => {
    const q = new AsyncQueue<number>()
    const p = q.pop()
    q.close()
    await expect(p).rejects.toThrow(QueueClosedError)
  })

  it("push after close throws", () => {
    const q = new AsyncQueue<number>()
    q.close()
    expect(() => q.push(1)).toThrow(QueueClosedError)
  })
})
