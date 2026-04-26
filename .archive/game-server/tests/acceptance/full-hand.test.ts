import { describe, it, expect } from "vitest"
import { startTestServer } from "../helpers/server.js"
import { spawnDumbBotLoopback } from "../../src/dev/dumb-bot-loopback.js"
import { tables, hands, actions } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("acceptance: full hand via loopback bots", () => {
  it("3 bots play a hand; DB has hands + actions; hand_ended recorded", async () => {
    const ts = await startTestServer()
    const [t] = await ts.db.insert(tables).values({
      slug: "acc-table",
      game_kind: "texas_holdem",
      status: "live",
      blinds: { sb: 5, bb: 10 },
      max_seats: 3,
    }).returning({ id: tables.id })
    await ts.registry.loadAll()

    const botPromises = [0, 1, 2].map((i) =>
      spawnDumbBotLoopback({ db: ts.db, registry: ts.registry, name: `acc-bot-${i}` }),
    )

    await waitForCondition(async () => {
      const rows = await ts.db.select().from(actions).where(eq(actions.kind, "hand_ended"))
      return rows.length >= 1
    }, 20_000)

    const handRows = await ts.db.select().from(hands).where(eq(hands.table_id, t!.id))
    const closed = handRows.find((h) => h.ended_at !== null)
    expect(closed).toBeDefined()
    expect(closed!.pot_total).toBeGreaterThan(0)
    expect(closed!.winners.length).toBeGreaterThan(0)

    await ts.cleanup()
    await Promise.allSettled(botPromises)
  }, 40_000)
})

async function waitForCondition(check: () => Promise<boolean>, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error("waitForCondition: timed out")
}
