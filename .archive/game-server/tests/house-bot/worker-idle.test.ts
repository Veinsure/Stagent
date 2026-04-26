import { describe, it, expect } from "vitest"
import { shouldIdlePause } from "../../src/house-bot/worker.js"

function mkDeps(rows: Array<{ agent_id?: string | null; persona: string | null }>) {
  return {
    db: {
      select: () => ({
        from: () => ({
          leftJoin: () => ({
            where: async () => rows,
          }),
        }),
      }),
    } as any,
    tableId: "t",
    idlePauseMs: 1000,
  }
}

describe("shouldIdlePause", () => {
  it("null idleSince → false", async () => {
    expect(await shouldIdlePause(mkDeps([]), null)).toBe(false)
  })

  it("under threshold → false", async () => {
    expect(await shouldIdlePause(mkDeps([]), Date.now() - 500)).toBe(false)
  })

  it("over threshold + only house-bots seated → true", async () => {
    expect(
      await shouldIdlePause(mkDeps([{ persona: "house-bot:random" }]), Date.now() - 2000),
    ).toBe(true)
  })

  it("over threshold + no seats at all → true (empty table)", async () => {
    expect(await shouldIdlePause(mkDeps([]), Date.now() - 2000)).toBe(true)
  })

  it("over threshold + human present → false", async () => {
    expect(
      await shouldIdlePause(mkDeps([{ persona: null }]), Date.now() - 2000),
    ).toBe(false)
    expect(
      await shouldIdlePause(mkDeps([{ persona: "real-user" }]), Date.now() - 2000),
    ).toBe(false)
  })

  it("mix of house-bot + human → false", async () => {
    expect(
      await shouldIdlePause(
        mkDeps([{ persona: "house-bot:random" }, { persona: null }]),
        Date.now() - 2000,
      ),
    ).toBe(false)
  })
})
