// Manual smoke: 1 ClaudeBot-Tight + 2 RandomBot on a fresh table; play 5 hands.
// Requires ANTHROPIC_API_KEY and TEST_DATABASE_URL in env.
import { freshSchema } from "../../../tests/helpers/schema.js"
import { createDbClient } from "../../db/client.js"
import { TableRegistry } from "../../actors/table-registry.js"
import { createGameServer, listen } from "../../server.js"
import { startHouseBotRunner } from "../runner.js"
import { tables, hands } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("set ANTHROPIC_API_KEY")
  process.exit(1)
}
if (!process.env.TEST_DATABASE_URL) {
  console.error("set TEST_DATABASE_URL (postgres://...) for smoke schema")
  process.exit(1)
}

const schema = await freshSchema()
const { db, close: closeDb } = createDbClient(schema.databaseUrl, schema.schemaName)
const registry = new TableRegistry(db)
await registry.loadAll()
const { server, close: closeServer } = createGameServer({ db, registry })
await listen(server, 0)

const [t] = await db
  .insert(tables)
  .values({
    slug: "smoke-claude",
    game_kind: "texas_holdem",
    status: "live",
    blinds: { sb: 5, bb: 10 },
    max_seats: 3,
  })
  .returning({ id: tables.id })
await registry.loadAll()

const runner = startHouseBotRunner({
  db,
  registry,
  config: {
    enabled: true,
    personas: [
      { name: "claude-tight", count: 1 },
      { name: "random", count: 2 },
    ],
    llm_budget_usd_per_persona: 1.0,
    idle_pause_ms: 60 * 60_000,
    target_seats_per_table: 3,
    anthropic_api_key: process.env.ANTHROPIC_API_KEY,
  },
})

const deadline = Date.now() + 120_000
while (Date.now() < deadline) {
  const rows = await db.select().from(hands).where(eq(hands.table_id, t!.id))
  const done = rows.filter((r) => r.ended_at !== null).length
  console.log(`hands finished: ${done}`)
  if (done >= 5) break
  await new Promise((r) => setTimeout(r, 2000))
}

await runner.stop()
await closeServer()
await registry.stopAll()
await closeDb()
await schema.cleanup()
console.log("smoke done")
