import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "../helpers/server.js"
import { startSpawner, type SpawnerHandle } from "../../src/house-bot/spawner.js"
import { CostGuard, RATES } from "../../src/house-bot/cost-guard.js"
import { makeClaudeTight } from "../../src/house-bot/persona/claude-tight.js"
import { withFallback } from "../../src/house-bot/persona/with-fallback.js"
import { RandomBot } from "../../src/house-bot/persona/random.js"
import { createMockAnthropic } from "../../src/house-bot/llm/mock.js"
import { tables, actions } from "@stagent/db-schema"

describe("cost guard trip -> downgrade", () => {
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

  it("after tripping budget, LLM stops being called and game continues via RandomBot", async () => {
    await ts.db
      .insert(tables)
      .values({
        slug: "hb-cg",
        game_kind: "texas_holdem",
        status: "live",
        blinds: { sb: 5, bb: 10 },
        max_seats: 2,
      })
    await ts.registry.loadAll()

    const tinyBudget = new CostGuard({ budgetUsd: 0.05, rates: RATES })

    // Every mock call returns huge usage; one call is enough to trip a 0.05 USD budget
    // (10K in @ 15/M + 10K out @ 75/M = $0.9).
    const llm = createMockAnthropic(
      Array.from({ length: 50 }, () => ({
        raw: { action: { kind: "call" } },
        usage: { input_tokens: 10_000, output_tokens: 10_000 },
      })),
    )

    let llmCalls = 0
    const origCreate = llm.client.messages.create.bind(llm.client.messages)
    llm.client.messages.create = (async (args: any) => {
      llmCalls++
      return origCreate(args)
    }) as typeof llm.client.messages.create

    const base = makeClaudeTight({ llm, costGuard: tinyBudget })
    const wrapped = withFallback(base, RandomBot, tinyBudget)

    spawner = startSpawner({
      db: ts.db,
      registry: ts.registry,
      personas: { "claude-tight": wrapped, random: RandomBot },
      targets: [
        { persona: "claude-tight", count: 1 },
        { persona: "random", count: 1 },
      ],
      target_seats_per_table: 2,
      idle_pause_ms: 10 * 60_000,
    })

    await new Promise((r) => setTimeout(r, 6_000))
    const callsBefore = llmCalls
    await new Promise((r) => setTimeout(r, 4_000))
    const callsAfter = llmCalls

    expect(callsBefore).toBeGreaterThan(0)
    // Once over budget, additional LLM calls should stop; allow +1 slack for a call
    // that raced the budget check.
    expect(callsAfter - callsBefore).toBeLessThanOrEqual(1)

    const rows = await ts.db.select().from(actions)
    expect(rows.length).toBeGreaterThan(0)
  }, 30_000)
})
