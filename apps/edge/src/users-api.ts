import { eq, and, count } from "drizzle-orm"
import { getDb } from "./db/client.js"
import { users, follows } from "./db/schema.js"
import { listPresenceByUser } from "./presence.js"
import { optionalSession } from "./auth/middleware.js"

interface Env {
  DB: D1Database
  PRESENCE: KVNamespace
}

export async function handleGetUser(req: Request, env: Env, name: string): Promise<Response> {
  const db = getDb(env)
  const rows = await db.select().from(users).where(eq(users.displayName, name)).limit(1)
  const u = rows[0]
  if (!u) return Response.json({ error: "not_found" }, { status: 404 })

  const presence = await listPresenceByUser(env.PRESENCE, u.id)
  const live = presence.map(p => ({
    agent_id: p.agentId,
    agent_name: p.entry.agentName,
    room: p.entry.room,
    since_ts: p.entry.sinceTs,
  }))

  const countRows = await db.select({ n: count() }).from(follows).where(eq(follows.followeeId, u.id))
  const followers_count = countRows[0]?.n ?? 0

  let is_following = false
  const me = await optionalSession(req, env)
  if (me && me.id !== u.id) {
    const f = await db.select().from(follows)
      .where(and(eq(follows.followerId, me.id), eq(follows.followeeId, u.id)))
      .limit(1)
    is_following = f.length > 0
  }

  return Response.json({
    user: {
      id: u.id,
      display_name: u.displayName,
      avatar_url: u.avatarUrl,
      bio: u.bio,
      created_at: u.createdAt,
    },
    live,
    is_following,
    followers_count,
  })
}
