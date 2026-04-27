import { eq } from "drizzle-orm"
import { getDb } from "../db/client.js"
import { sessions, users } from "../db/schema.js"
import { hashSessionToken, parseSessionCookie } from "./session.js"

export interface AuthenticatedUser {
  id: string
  email: string
  displayName: string
}

export async function requireSession(
  req: Request,
  env: { DB: D1Database },
): Promise<AuthenticatedUser | Response> {
  const token = parseSessionCookie(req.headers)
  if (!token) return unauthenticated()
  const db = getDb(env)
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, hashSessionToken(token)))
    .limit(1)
  const r = rows[0]
  if (!r || r.expiresAt < Date.now()) return unauthenticated()
  return { id: r.id, email: r.email, displayName: r.displayName }
}

export async function optionalSession(
  req: Request,
  env: { DB: D1Database },
): Promise<AuthenticatedUser | null> {
  const token = parseSessionCookie(req.headers)
  if (!token) return null
  const db = getDb(env)
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, hashSessionToken(token)))
    .limit(1)
  const r = rows[0]
  if (!r || r.expiresAt < Date.now()) return null
  return { id: r.id, email: r.email, displayName: r.displayName }
}

function unauthenticated(): Response {
  return new Response(JSON.stringify({ error: "unauthenticated" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  })
}
