import { isNull } from "drizzle-orm"
import { hands } from "@stagent/db-schema"
import type { Db } from "./db/client.js"

/** Mark all hands with ended_at IS NULL as aborted. Returns affected count. */
export async function abortUnfinishedHands(db: Db): Promise<number> {
  const result = await db
    .update(hands)
    .set({ ended_at: new Date(), aborted: true })
    .where(isNull(hands.ended_at))
    .returning({ id: hands.id })
  return result.length
}
