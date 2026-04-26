import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { eq } from "drizzle-orm"
import { fileURLToPath } from "node:url"
import { tables } from "./schema.js"

const DEMO_TABLES = [
  { slug: "直播测试1", blinds: { sb: 5, bb: 10 }, max_seats: 6 },
  { slug: "直播测试2", blinds: { sb: 5, bb: 10 }, max_seats: 6 },
  { slug: "直播测试3", blinds: { sb: 10, bb: 20 }, max_seats: 6 },
] as const

export async function seedDemoTables(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1 })
  const db = drizzle(sql)
  try {
    for (const t of DEMO_TABLES) {
      const existing = await db.select().from(tables).where(eq(tables.slug, t.slug)).limit(1)
      if (existing.length > 0) continue
      await db.insert(tables).values({
        slug: t.slug,
        game_kind: "texas_holdem",
        status: "live",
        blinds: t.blinds,
        max_seats: t.max_seats,
      })
    }
  } finally {
    await sql.end()
  }
}

// CLI entry point (run via `pnpm drizzle:seed`)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL is required")
    process.exit(1)
  }
  seedDemoTables(url)
    .then(() => { console.log("demo tables seeded"); process.exit(0) })
    .catch((e) => { console.error(e); process.exit(1) })
}
