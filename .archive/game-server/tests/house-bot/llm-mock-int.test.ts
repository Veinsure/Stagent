import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "../helpers/server.js"
import { startSpawner, type SpawnerHandle } from "../../src/house-bot/spawner.js"
import { createMockAnthropic } from "../../src/house-bot/llm/mock.js"
import { makeClaudeTight } from "../../src/house-bot/persona/claude-tight.js"
import { CostGuard, RATES } from "../../src/house-bot/cost-guard.js"
import { RandomBot } from "../../src/house-bot/persona/random.js"
import { tables, actions } from "@stagent/db-schema"

describe("mock LLM end-to-end", () => {
  let ts: TestServer
  let spawner: SpawnerHandle | null = null

  beforeEach(async () => {
    ts = await startTestServer()
  })

  afterEach(async () => {
    if (spawner) {
      await spawner.stop()
      spawner = null
    }
    await ts.cleanup()
  })

  it("claude-tight via mock LLM writes think/say rows to actions table", async () => {
    await ts.db
      .insert(tables)
      .values({
        slug: "hb-mock",
        game_kind: "texas_holdem",
        status: "live",
        blinds: { sb: 5, bb: 10 },
        max_seats: 2,
      })
    await ts.registry.loadAll()

    const llm = createMockAnthropic(
      Array.from({ length: 100 }, () => ({
        raw: { action: { kind: "check" }, think: "thinking aloud", say: "gg" },
      })),
    )
    const guard = new CostGuard({ budgetUsd: 100, rates: RATES })
    const persona = makeClaudeTight({ llm, costGuard: guard })

    spawner = startSpawner({
      db: ts.db,
      registry: ts.registry,
      personas: { "claude-tight": persona, random: RandomBot },
      targets: [
        { persona: "claude-tight", count: 1 },
        { persona: "random", count: 1 },
      ],
      target_seats_per_table: 2,
      idle_pause_ms: 10 * 60_000,
    })

    const deadline = Date.now() + 10_000
    let sawThink = false
    let sawSay = false
    while (Date.now() < deadline && (!sawThink || !sawSay)) {
      const rows = await ts.db.select().from(actions)
      sawThink = rows.some((r) => r.kind === "think" && r.text?.includes("thinking"))
      sawSay = rows.some((r) => r.kind === "say" && r.text === "gg")
      if (sawThink && sawSay) break
      await new Promise((r) => setTimeout(r, 250))
    }

    expect(sawThink).toBe(true)
    expect(sawSay).toBe(true)
  }, 20_000)
})
