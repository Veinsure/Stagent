import { toolSchemas, McpToolError, type ToolName } from "@stagent/mcp-tools"
import { agents, tables, tableSeats } from "@stagent/db-schema"
import { eq } from "drizzle-orm"
import crypto from "node:crypto"
import type { Db } from "../db/client.js"
import type { McpConnection } from "./connection.js"
import type { RequestFrame, ResponseFrame } from "./transport-ws.js"
import type { TableRegistry } from "../actors/table-registry.js"

export interface HandlerDeps {
  db: Db
  registry?: TableRegistry
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
      const authed = await verifyOwner(deps, conn, conn.owner_token)
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

async function verifyOwner(deps: HandlerDeps, conn: McpConnection, token: string): Promise<boolean> {
  const row = await deps.db.select({ id: agents.id }).from(agents).where(eq(agents.owner_token, token)).limit(1)
  if (row.length === 0) return false
  conn.agent_id = row[0]!.id
  wireDisconnect(deps, conn)
  // Enqueue reconnect
  if (conn.agent_id && deps.registry) {
    findAgentTable(deps.db, conn.agent_id).then((table) => {
      if (table) deps.registry!.get(table.table_id).enqueue({ kind: "reconnect", agent_id: conn.agent_id! }).catch(() => {})
    }).catch(() => {})
  }
  return true
}

async function findAgentTable(db: Db, agent_id: string): Promise<{ table_id: string } | null> {
  const rows = await db.select({ table_id: tableSeats.table_id }).from(tableSeats).where(eq(tableSeats.agent_id, agent_id)).limit(1)
  return rows[0] ?? null
}

async function dispatch(deps: HandlerDeps, conn: McpConnection, name: ToolName, input: unknown): Promise<unknown> {
  switch (name) {
    case "register_agent": return await registerAgent(deps, conn, input as { name: string; model?: string; persona?: string; avatar_seed?: string })
    case "list_tables":    return await listTablesTool(deps, input as { game?: string; status?: string })
    case "join_table": {
      if (!conn.agent_id) throw new McpToolError("not_authenticated", "")
      const { table_id, seat } = input as { table_id: string; seat?: number }
      if (!deps.registry) throw new McpToolError("internal_error", "registry not initialized")
      if (!deps.registry.has(table_id)) throw new McpToolError("table_not_found", table_id)
      if (seat !== undefined) {
        return await deps.registry.get(table_id).enqueue({ kind: "join", agent_id: conn.agent_id, seat })
      } else {
        return await deps.registry.get(table_id).enqueue({ kind: "join", agent_id: conn.agent_id })
      }
    }
    case "leave_table": {
      if (!conn.agent_id) throw new McpToolError("not_authenticated", "")
      const { table_id } = input as { table_id: string }
      if (!deps.registry) throw new McpToolError("internal_error", "registry not initialized")
      if (!deps.registry.has(table_id)) throw new McpToolError("table_not_found", table_id)
      return await deps.registry.get(table_id).enqueue({ kind: "leave", agent_id: conn.agent_id })
    }
    case "wait_for_my_turn": {
      if (!conn.agent_id) throw new McpToolError("not_authenticated", "")
      const { table_id, timeout_s } = input as { table_id: string; timeout_s?: number }
      if (!deps.registry) throw new McpToolError("internal_error", "registry not initialized")
      if (!deps.registry.has(table_id)) throw new McpToolError("table_not_found", table_id)
      const deadline_ms = Date.now() + (timeout_s ?? 60) * 1000
      return await deps.registry.get(table_id).awaitTurn(conn.agent_id, deadline_ms)
    }
    case "texas_holdem.fold":
    case "texas_holdem.check":
    case "texas_holdem.call":
    case "texas_holdem.all_in":
    case "texas_holdem.raise": {
      if (!conn.agent_id) throw new McpToolError("not_authenticated", "")
      const kind = name.split(".")[1] as "fold" | "check" | "call" | "all_in" | "raise"
      const action = kind === "raise"
        ? { kind, amount: (input as { amount: number }).amount }
        : { kind }
      // Routing: we need the table_id. For W2 we require a single active seat
      // across all tables for a connection, so we look up via conn.agent_id → table.
      if (!deps.registry) throw new McpToolError("internal_error", "registry not initialized")
      const table = await findAgentTable(deps.db, conn.agent_id)
      if (!table) throw new McpToolError("not_seated", "no active seat")
      return await deps.registry.get(table.table_id).enqueue({ kind: "apply_action", agent_id: conn.agent_id, action })
    }
    case "say":
    case "think":
    case "tag": {
      if (!conn.agent_id) throw new McpToolError("not_authenticated", "")
      if (!deps.registry) throw new McpToolError("internal_error", "registry not initialized")
      const table = await findAgentTable(deps.db, conn.agent_id)
      if (!table) throw new McpToolError("not_seated", "")
      const cmd = name === "tag"
        ? { kind: "tag" as const, agent_id: conn.agent_id, label: (input as { label: string }).label }
        : { kind: name as "say" | "think", agent_id: conn.agent_id, text: (input as { text: string }).text }
      return await deps.registry.get(table.table_id).enqueue(cmd)
    }
    default: throw new McpToolError("unknown_tool", `dispatch miss: ${name}`)
  }
}

async function listTablesTool(deps: HandlerDeps, input: { game?: string; status?: string }) {
  const rows = await deps.db.select().from(tables)
  const seatCounts = await deps.db.select({ table_id: tableSeats.table_id }).from(tableSeats)
  const countMap = new Map<string, number>()
  for (const s of seatCounts) countMap.set(s.table_id, (countMap.get(s.table_id) ?? 0) + 1)
  return rows
    .filter((r) => !input.game   || r.game_kind === input.game)
    .filter((r) => !input.status || r.status    === input.status)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      game_kind: r.game_kind,
      status: r.status,
      seats_filled: countMap.get(r.id) ?? 0,
      max_seats: r.max_seats,
    }))
}

/**
 * Attach a one-shot WS close listener that enqueues a disconnect command
 * to whichever table the agent is seated at. Idempotent per-connection.
 */
function wireDisconnect(deps: HandlerDeps, conn: McpConnection): void {
  if ((conn as unknown as { __disconnectWired?: boolean }).__disconnectWired) return
  (conn as unknown as { __disconnectWired?: boolean }).__disconnectWired = true
  conn.ws.once("close", async () => {
    if (!conn.agent_id) return
    const table = await findAgentTable(deps.db, conn.agent_id).catch(() => null)
    if (table && deps.registry) {
      deps.registry
        .get(table.table_id)
        .enqueue({ kind: "disconnect", agent_id: conn.agent_id })
        .catch(() => {})
    }
  })
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
  wireDisconnect(deps, conn)
  return { agent_id: row!.id, owner_token }
}

function err(id: string, code: string, message: string): ResponseFrame {
  return { id, error: { code, message } }
}
