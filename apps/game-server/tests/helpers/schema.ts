import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "db-schema", "drizzle",
)

export interface FreshSchema {
  databaseUrl: string
  schemaName: string
  cleanup: () => Promise<void>
}

export async function freshSchema(): Promise<FreshSchema> {
  const baseUrl = process.env.TEST_DATABASE_URL
  if (!baseUrl) throw new Error("TEST_DATABASE_URL not set (did testcontainers setup run?)")
  const schemaName = `test_${crypto.randomBytes(8).toString("hex")}`

  const adminSql = postgres(baseUrl, { max: 1 })
  await adminSql`CREATE SCHEMA ${adminSql(schemaName)}`
  await adminSql.end()

  // CRUD conn scoped to the new schema via search_path
  const sql = postgres(baseUrl, { max: 2, connection: { search_path: schemaName } })
  const db = drizzle(sql)
  try {
    await migrate(db, { migrationsFolder, migrationsSchema: schemaName })
  } catch (err) {
    await sql.end().catch(() => {})
    const admin = postgres(baseUrl, { max: 1 })
    await admin`DROP SCHEMA IF EXISTS ${admin(schemaName)} CASCADE`.catch(() => {})
    await admin.end().catch(() => {})
    throw err
  }
  return {
    databaseUrl: baseUrl,
    schemaName,
    cleanup: async () => {
      await sql.end()
      const admin = postgres(baseUrl, { max: 1 })
      await admin`DROP SCHEMA ${admin(schemaName)} CASCADE`
      await admin.end()
    },
  }
}
