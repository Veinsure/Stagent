import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { getDb } from "./db/client.js"
import { agents } from "./db/schema.js"
import { requireSession } from "./auth/middleware.js"
import { generateAgentToken, hashAgentToken } from "./agents/token.js"

interface Env { DB: D1Database }

const createInput = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  avatar_url: z.string().url().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

function ulid(): string {
  const t = Date.now().toString(36).padStart(10, "0")
  const r = new Uint8Array(10)
  crypto.getRandomValues(r)
  return t + Array.from(r, b => b.toString(36)).join("").slice(0, 16)
}

function publicAgent(a: typeof agents.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    avatar_url: a.avatarUrl,
    color: a.color,
    created_at: a.createdAt,
    last_used_at: a.lastUsedAt,
    hands_played: a.handsPlayed,
    hands_won: a.handsWon,
    total_winnings: a.totalWinnings,
  }
}

export async function handleListAgents(req: Request, env: Env): Promise<Response> {
  const session = await requireSession(req, env)
  if (session instanceof Response) return session
  const db = getDb(env)
  const rows = await db.select().from(agents).where(eq(agents.userId, session.id))
  return Response.json({ agents: rows.map(publicAgent) })
}

export async function handleCreateAgent(req: Request, env: Env): Promise<Response> {
  const session = await requireSession(req, env)
  if (session instanceof Response) return session

  const body = await req.json<unknown>()
  const parsed = createInput.safeParse(body)
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 })

  const db = getDb(env)
  const dup = await db.select().from(agents)
    .where(and(eq(agents.userId, session.id), eq(agents.name, parsed.data.name)))
    .limit(1)
  if (dup.length > 0) return Response.json({ error: "name_taken" }, { status: 409 })

  const token = generateAgentToken()
  const id = ulid()
  await db.insert(agents).values({
    id,
    userId: session.id,
    name: parsed.data.name,
    description: parsed.data.description,
    avatarUrl: parsed.data.avatar_url,
    color: parsed.data.color,
    apiTokenHash: hashAgentToken(token),
    createdAt: Date.now(),
  })
  return Response.json({
    id, name: parsed.data.name,
    description: parsed.data.description,
    avatar_url: parsed.data.avatar_url,
    color: parsed.data.color,
    token,
  })
}

export async function handleDeleteAgent(req: Request, env: Env, id: string): Promise<Response> {
  const session = await requireSession(req, env)
  if (session instanceof Response) return session
  const db = getDb(env)
  const result = await db.delete(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, session.id)))
    .returning({ id: agents.id })
  if (result.length === 0) return Response.json({ error: "not_found" }, { status: 404 })
  return Response.json({ ok: true })
}

export async function handleRotateAgent(req: Request, env: Env, id: string): Promise<Response> {
  const session = await requireSession(req, env)
  if (session instanceof Response) return session
  const db = getDb(env)
  const owned = await db.select().from(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, session.id)))
    .limit(1)
  if (owned.length === 0) return Response.json({ error: "not_found" }, { status: 404 })
  const token = generateAgentToken()
  await db.update(agents)
    .set({ apiTokenHash: hashAgentToken(token) })
    .where(eq(agents.id, id))
  return Response.json({ id, token })
}
