import { toolSchemas, McpToolError, type ToolName } from "@stagent/mcp-tools"
import { agents } from "@stagent/db-schema"
import { eq } from "drizzle-orm"
import crypto from "node:crypto"
import type { Db } from "../db/client.js"
import type { McpConnection } from "./connection.js"
import type { RequestFrame, ResponseFrame } from "./transport-ws.js"

export interface HandlerDeps {
  db: Db
}

export function createHandler(deps: HandlerDeps) {
  return async function handle(conn: McpConnection, frame: RequestFrame): Promise<ResponseFrame> {
    const name = frame.method as ToolName
    const spec = toolSchemas[name]
    if (!spec) return err(frame.id, "unknown_tool", `no such tool: ${frame.method}`)

    // Input validation
    const parsed = spec.input.safeParse(frame.params)
    if (!parsed.success) return err(frame.id, "invalid_params", parsed.error.message)

    // Auth check
    if (spec.auth) {
      if (!conn.owner_token) return err(frame.id, "not_authenticated", "owner_token required")
      const authed = await verifyOwner(deps.db, conn, conn.owner_token)
      if (!authed) return err(frame.id, "not_authenticated", "token mismatch")
    }

    try {
      const result = await dispatch(deps, conn, name, parsed.data)
      return { id: frame.id, result }
    } catch (e) {
      if (e instanceof McpToolError) return err(frame.id, e.code, e.message)
      throw e
    }
  }
}

async function verifyOwner(db: Db, conn: McpConnection, token: string): Promise<boolean> {
  const row = await db.select({ id: agents.id }).from(agents).where(eq(agents.owner_token, token)).limit(1)
  if (row.length === 0) return false
  conn.agent_id = row[0]!.id
  return true
}

async function dispatch(deps: HandlerDeps, conn: McpConnection, name: ToolName, input: unknown): Promise<unknown> {
  switch (name) {
    case "register_agent": return await registerAgent(deps, conn, input as { name: string; model?: string; persona?: string; avatar_seed?: string })
    default: throw new McpToolError("unknown_tool", `dispatch miss: ${name}`)
  }
}

async function registerAgent(deps: HandlerDeps, conn: McpConnection, input: { name: string; model?: string; persona?: string; avatar_seed?: string }) {
  const owner_token = crypto.randomBytes(32).toString("hex")
  const values: { name: string; owner_token: string; model?: string; persona?: string; avatar_seed?: string } = {
    name: input.name,
    owner_token,
  }
  if (input.model !== undefined) values.model = input.model
  if (input.persona !== undefined) values.persona = input.persona
  if (input.avatar_seed !== undefined) values.avatar_seed = input.avatar_seed
  const [row] = await deps.db.insert(agents).values(values).returning({ id: agents.id })
  conn.agent_id = row!.id
  conn.owner_token = owner_token
  return { agent_id: row!.id, owner_token }
}

function err(id: string, code: string, message: string): ResponseFrame {
  return { id, error: { code, message } }
}
