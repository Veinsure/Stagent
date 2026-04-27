import { eq, and } from "drizzle-orm"
import { getDb } from "./db/client.js"
import { follows, users } from "./db/schema.js"
import { requireSession } from "./auth/middleware.js"

interface Env { DB: D1Database }

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

export async function handleUnfollow(_req: Request, _env: Env, _name: string): Promise<Response> {
  return new Response(null, { status: 501 })  // stub — replaced in Task 3
}
