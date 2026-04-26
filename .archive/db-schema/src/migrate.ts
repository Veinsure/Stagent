import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

export async function runMigrations(databaseUrl: string): Promise<void> {
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle")
  const sql = postgres(databaseUrl, { max: 1 })
  const db = drizzle(sql)
  try {
    await migrate(db, { migrationsFolder })
  } finally {
    await sql.end()
  }
}

// CLI entry point (run via `pnpm drizzle:migrate`)
// Use fileURLToPath for cross-platform comparison (handles Windows backslash paths)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL is required")
    process.exit(1)
  }
  runMigrations(url)
    .then(() => { console.log("migrations applied"); process.exit(0) })
    .catch((e) => { console.error(e); process.exit(1) })
}
