import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "../helpers/server.js"
import { startHouseBotRunner, type RunnerHandle } from "../../src/house-bot/runner.js"
import { tables, tableSeats } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("house-bot idle-pause", () => {
  let ts: TestServer
  let runner: RunnerHandle | null = null

  beforeEach(async () => {
    ts = await startTestServer()
  })

  afterEach(async () => {
    if (runner) {
      await runner.stop()
      runner = null
    }
    await ts.cleanup()
  })

  it("bots leave table after idle window elapses with no humans seated", async () => {
    const [t] = await ts.db
      .insert(tables)
      .values({
        slug: "hb-idle",
        game_kind: "texas_holdem",
        status: "live",
        blinds: { sb: 5, bb: 10 },
        max_seats: 3,
      })
      .returning({ id: tables.id })
    await ts.registry.loadAll()

    runner = startHouseBotRunner({
      db: ts.db,
      registry: ts.registry,
      config: {
        enabled: true,
        personas: [{ name: "random", count: 2 }],
        llm_budget_usd_per_persona: 0,
        idle_pause_ms: 2_000,
        target_seats_per_table: 2,
      },
    })

    await eventually(async () => {
      const rows = await ts.db.select().from(tableSeats).where(eq(tableSeats.table_id, t!.id))
      return rows.length >= 2
    }, 10_000)

    await eventually(async () => {
      const rows = await ts.db.select().from(tableSeats).where(eq(tableSeats.table_id, t!.id))
      return rows.length === 0
    }, 45_000)
  }, 60_000)
})

async function eventually(check: () => Promise<boolean>, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error("eventually: timeout")
}
