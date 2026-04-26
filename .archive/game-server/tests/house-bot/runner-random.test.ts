import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer, type TestServer } from "../helpers/server.js"
import { startHouseBotRunner, type RunnerHandle } from "../../src/house-bot/runner.js"
import { tables, hands, tableSeats } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("house-bot runner: 3xRandomBot acceptance", () => {
  let ts: TestServer
  let tableId: string
  let runner: RunnerHandle | null = null

  beforeEach(async () => {
    ts = await startTestServer()
    const [t] = await ts.db
      .insert(tables)
      .values({
        slug: "hb-accept",
        game_kind: "texas_holdem",
        status: "live",
        blinds: { sb: 5, bb: 10 },
        max_seats: 3,
      })
      .returning({ id: tables.id })
    tableId = t!.id
    await ts.registry.loadAll()
  })

  afterEach(async () => {
    if (runner) {
      await runner.stop()
      runner = null
    }
    await ts.cleanup()
  })

  it("plays >= 100 hands with chips conserved", async () => {
    runner = startHouseBotRunner({
      db: ts.db,
      registry: ts.registry,
      config: {
        enabled: true,
        personas: [{ name: "random", count: 3 }],
        llm_budget_usd_per_persona: 0,
        idle_pause_ms: 10 * 60_000,
        target_seats_per_table: 3,
      },
    })

    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      const rows = await ts.db.select().from(hands).where(eq(hands.table_id, tableId))
      const finished = rows.filter((r) => r.ended_at !== null).length
      if (finished >= 100) break
      await new Promise((r) => setTimeout(r, 250))
    }

    const allHands = await ts.db.select().from(hands).where(eq(hands.table_id, tableId))
    const finished = allHands.filter((r) => r.ended_at !== null)
    expect(finished.length).toBeGreaterThanOrEqual(100)

    const seats = await ts.db.select().from(tableSeats).where(eq(tableSeats.table_id, tableId))
    const totalChipsNow = seats.reduce((s, r) => s + r.chips, 0)
    const totalPotsPaid = finished.reduce((s, r) => s + (r.pot_total ?? 0), 0)
    const totalWinsPaid = finished.reduce(
      (s, r) => s + (r.winners ?? []).reduce((x, w) => x + (w.won ?? 0), 0),
      0,
    )
    expect(totalWinsPaid).toBe(totalPotsPaid)
    expect(totalChipsNow).toBeGreaterThan(0)
  }, 90_000)
})
