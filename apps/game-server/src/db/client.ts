import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { schema } from "@stagent/db-schema"

export type Db = PostgresJsDatabase<typeof schema>

export function createDbClient(databaseUrl: string, searchPath?: string): { db: Db; close: () => Promise<void> } {
  const options: { max: number; connection?: { search_path: string } } = { max: 10 }
  if (searchPath) options.connection = { search_path: searchPath }
  const sql = postgres(databaseUrl, options)
  const db = drizzle(sql, { schema })
  return { db, close: () => sql.end() }
}
