import { tables } from "@stagent/db-schema"
import type { Db } from "../db/client.js"
import { TableActor, type TableMeta } from "./table-actor.js"

export class TableRegistry {
  private actors = new Map<string, TableActor>()
  private starts: Promise<void>[] = []

  constructor(private db: Db) {}

  async loadAll(): Promise<void> {
    const rows = await this.db.select().from(tables)
    for (const t of rows) {
      const meta: TableMeta = { id: t.id, slug: t.slug, blinds: t.blinds, max_seats: t.max_seats }
      const actor = new TableActor(meta, this.db)
      this.actors.set(t.id, actor)
      this.starts.push(actor.start())
    }
  }

  get(table_id: string): TableActor {
    const a = this.actors.get(table_id)
    if (!a) throw new Error(`table not found: ${table_id}`)
    return a
  }

  has(table_id: string): boolean { return this.actors.has(table_id) }
  all(): TableActor[] { return [...this.actors.values()] }

  async stopAll(): Promise<void> {
    for (const a of this.actors.values()) await a.stop()
    await Promise.allSettled(this.starts)
  }
}
