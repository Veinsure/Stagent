import { eq, and, desc } from "drizzle-orm"
import { getDb } from "./db/client.js"
import { follows, users } from "./db/schema.js"
import { requireSession } from "./auth/middleware.js"
import { listPresenceByUser } from "./presence.js"

interface Env { DB: D1Database; PRESENCE: KVNamespace }

export async function handleFollow(req: Request, env: Env, name: string): Promise<Response> {
  const session = await requireSession(req, env)
  if (session instanceof Response) return session

  const db = getDb(env)
  const targetRows = await db.select({ id: users.id })
    .from(users).where(eq(users.displayName, name)).limit(1)
  const target = targetRows[0]
  if (!target) return Response.json({ error: "not_found" }, { status: 404 })
  if (target.id === session.id) return Response.json({ error: "self_follow" }, { status: 400 })

  const existing = await db.select().from(follows)
    .where(and(eq(follows.followerId, session.id), eq(follows.followeeId, target.id))).limit(1)
  if (existing[0]) return Response.json({ ok: true, already: true }, { status: 200 })

  await db.insert(follows).values({
    followerId: session.id, followeeId: target.id, createdAt: Date.now(),
  })
  return Response.json({ ok: true }, { status: 201 })
}

export async function handleUnfollow(req: Request, env: Env, name: string): Promise<Response> {
  const session = await requireSession(req, env)
  if (session instanceof Response) return session

  const db = getDb(env)
  const targetRows = await db.select({ id: users.id })
    .from(users).where(eq(users.displayName, name)).limit(1)
  const target = targetRows[0]
  if (!target) return new Response(null, { status: 204 })  // idempotent

  await db.delete(follows)
    .where(and(eq(follows.followerId, session.id), eq(follows.followeeId, target.id)))
  return new Response(null, { status: 204 })
}

export async function handleListMyFollowing(req: Request, env: Env): Promise<Response> {
  const session = await requireSession(req, env)
  if (session instanceof Response) return session

  const db = getDb(env)
  const rows = await db
    .select({
      display_name: users.displayName,
      avatar_url: users.avatarUrl,
      followee_id: users.id,
      created_at: follows.createdAt,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followeeId, users.id))
    .where(eq(follows.followerId, session.id))
    .orderBy(desc(follows.createdAt))
    .limit(10)

  // is_live via KV
  const items = await Promise.all(rows.map(async r => {
    const presence = await listPresenceByUser(env.PRESENCE, r.followee_id)
    return {
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      is_live: presence.length > 0,
    }
  }))
  return Response.json({ items })
}
