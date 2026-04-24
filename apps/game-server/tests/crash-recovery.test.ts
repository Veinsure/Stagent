import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { startTestServer } from "./helpers/server.js"
import { freshSchema } from "./helpers/schema.js"
import { createDbClient } from "../src/db/client.js"
import { abortUnfinishedHands } from "../src/recovery.js"
import { tables, hands, agents } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

describe("crash recovery", () => {
  it("marks hands with ended_at IS NULL as aborted=true", async () => {
    const schema = await freshSchema()
    const { db, close } = createDbClient(schema.databaseUrl, schema.schemaName)
    // Seed: 1 table + 1 agent + 1 unfinished hand
    const [t] = await db.insert(tables).values({ slug: "cr", game_kind: "texas_holdem", status: "live", blinds: { sb: 5, bb: 10 }, max_seats: 6 }).returning({ id: tables.id })
    const [a] = await db.insert(agents).values({ name: "a", owner_token: "t" }).returning({ id: agents.id })
    await db.insert(hands).values({ table_id: t!.id, hand_no: 1, rng_seed: "x" })     // ended_at=null
    const finished = await db.insert(hands).values({ table_id: t!.id, hand_no: 2, rng_seed: "y", ended_at: new Date() }).returning({ id: hands.id })

    const count = await abortUnfinishedHands(db)
    expect(count).toBe(1)

    const rows = await db.select().from(hands)
    const unf = rows.find((r) => r.hand_no === 1)!
    expect(unf.aborted).toBe(true)
    expect(unf.ended_at).not.toBeNull()
    const fin = rows.find((r) => r.id === finished[0]!.id)!
    expect(fin.aborted).toBe(false)     // other hand unchanged

    await close()
    await schema.cleanup()
  })
})
