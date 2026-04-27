import { eq } from "drizzle-orm"
import { getDb } from "../db/client.js"
import { agents } from "../db/schema.js"
import { hashAgentToken } from "../agents/token.js"

export interface AgentContext {
  agentId: string
  userId: string
  name: string
  avatarUrl: string | null
  color: string | null
}

export async function lookupAgentByBearer(
  req: Request,
  env: { DB: D1Database },
): Promise<AgentContext | null> {
  const auth = req.headers.get("Authorization")
  if (!auth || !auth.startsWith("Bearer ")) return null
  const token = auth.slice(7).trim()
  if (!token) return null
  const db = getDb(env)
  const rows = await db.select().from(agents)
    .where(eq(agents.apiTokenHash, hashAgentToken(token)))
    .limit(1)
  const a = rows[0]
  if (!a) return null
  return {
    agentId: a.id,
    userId: a.userId,
    name: a.name,
    avatarUrl: a.avatarUrl,
    color: a.color,
  }
}

export async function touchAgentLastUsed(
  env: { DB: D1Database },
  agentId: string,
): Promise<void> {
  const db = getDb(env)
  await db.update(agents).set({ lastUsedAt: Date.now() }).where(eq(agents.id, agentId))
}
