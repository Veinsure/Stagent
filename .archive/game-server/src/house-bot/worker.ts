import { EventEmitter } from "node:events"
import { LoopbackTransport } from "@stagent/mcp-tools"
import { createHandler } from "../mcp/handler.js"
import type { Db } from "../db/client.js"
import type { TableRegistry } from "../actors/table-registry.js"
import type { Persona, TurnContext, LegalAction } from "./persona/types.js"
import { agents as agentsTable, tableSeats } from "@stagent/db-schema"
import { eq } from "drizzle-orm"

export interface WorkerDeps {
  db: Db
  registry: TableRegistry
  persona: Persona
  tableId: string
  idlePauseMs: number
}

export interface WorkerHandle {
  promise: Promise<void>
  stop: () => void
  agentIdPromise: Promise<string | null>
}

export function startWorker(deps: WorkerDeps): WorkerHandle {
  const ac = new AbortController()
  let resolveAgentId!: (s: string | null) => void
  const agentIdPromise = new Promise<string | null>((res) => {
    resolveAgentId = res
  })
  const promise = run(deps, ac.signal, resolveAgentId).catch((e) => {
    if (!ac.signal.aborted) {
      console.error(`[house-bot:${deps.persona.name}] worker crashed:`, (e as Error).message)
    }
    resolveAgentId(null)
  })
  return { promise, stop: () => ac.abort(), agentIdPromise }
}

async function run(
  deps: WorkerDeps,
  signal: AbortSignal,
  gotAgentId: (s: string | null) => void,
): Promise<void> {
  const handler = createHandler({ db: deps.db, registry: deps.registry })
  const transport = new LoopbackTransport()
  const fakeWs = new EventEmitter() as unknown as import("ws").WebSocket
  const conn = {
    id: `hb-${deps.persona.name}-${Math.random().toString(36).slice(2, 8)}`,
    ws: fakeWs,
    agent_id: null as string | null,
    owner_token: null as string | null,
  }
  transport.bindHandler(async (method, params) => {
    const resp = await handler(conn as any, { id: "0", method, params } as any)
    if (resp.error) throw new Error(`${resp.error.code}: ${resp.error.message}`)
    return resp.result
  })

  const client = transport.connect()

  try {
    const { agent_id, owner_token } = await client.call("register_agent", {
      name: `${deps.persona.display_name}-${Math.random().toString(36).slice(2, 6)}`,
      ...(deps.persona.model ? { model: deps.persona.model } : {}),
      persona: deps.persona.bio,
      avatar_seed: deps.persona.avatar_seed,
    })
    client.setOwnerToken(owner_token)
    conn.agent_id = agent_id ?? null
    conn.owner_token = owner_token
    gotAgentId(agent_id ?? null)
  } catch (e) {
    gotAgentId(null)
    throw e
  }

  try {
    await client.call("join_table", { table_id: deps.tableId })
  } catch (e) {
    throw e
  }

  let idleSince: number | null = null
  const checkIdle = async (): Promise<boolean> => {
    const hasHuman = await tableHasHuman(deps.db, deps.tableId)
    if (hasHuman) {
      idleSince = null
      return false
    }
    if (idleSince === null) idleSince = Date.now()
    return Date.now() - idleSince >= deps.idlePauseMs
  }
  try {
    while (!signal.aborted) {
      let turn: any
      try {
        turn = await client.call("wait_for_my_turn", { table_id: deps.tableId, timeout_s: 5 })
      } catch {
        if (signal.aborted) break
        continue
      }
      if (!turn || turn.kind === "timeout") {
        if (await checkIdle()) break
        continue
      }

      const ctx = buildContext(turn)
      const budgetMs = Math.min(turn.time_budget_ms ?? 30_000, 30_000)
      const childAc = new AbortController()
      const budgetTimer = setTimeout(() => childAc.abort(), Math.max(100, budgetMs - 500))
      const onParentAbort = () => childAc.abort()
      signal.addEventListener("abort", onParentAbort, { once: true })

      let decision
      try {
        decision = await deps.persona.decide(ctx, childAc.signal)
      } catch (e) {
        const fallback = pickSafeAction(ctx.legal_actions)
        decision = { action: fallback }
        if (!signal.aborted) {
          console.warn(
            `[house-bot:${deps.persona.name}] decide failed, falling back:`,
            (e as Error).message,
          )
        }
      } finally {
        clearTimeout(budgetTimer)
        signal.removeEventListener("abort", onParentAbort)
      }

      try {
        if (decision.think) {
          await client.call("think", { text: decision.think })
        }
        if (decision.say) {
          await client.call("say", { text: decision.say })
        }
        const args: any =
          decision.action.kind === "raise" ? { amount: decision.action.amount } : {}
        await client.call(`texas_holdem.${decision.action.kind}`, args)
      } catch {
        if (signal.aborted) break
        // stale turn (someone else acted, hand ended, etc.) — just loop
      }
      if (await checkIdle()) break
    }
  } finally {
    try {
      await client.call("leave_table", { table_id: deps.tableId })
    } catch {
      // ignore
    }
  }
}

function buildContext(turn: any): TurnContext {
  const state = turn.state
  const meIndex = typeof state?.to_act === "number" ? state.to_act : 0
  const me = state?.seats?.[meIndex] ?? { chips: 0, contributed_this_street: 0 }
  const pot =
    state?.pot_main ??
    state?.pot ??
    (state?.pots ? (state.pots as any[]).reduce((s, p) => s + (p.amount ?? 0), 0) : 0)
  const to_call = Math.max(
    0,
    (state?.current_bet ?? 0) - (me?.contributed_this_street ?? 0),
  )
  return {
    state,
    legal_actions: turn.legal_actions ?? [],
    time_budget_ms: turn.time_budget_ms ?? 30_000,
    hand_no: state?.hand_no ?? 0,
    my_stack: me?.chips ?? 0,
    pot,
    to_call,
  }
}

function pickSafeAction(legal: LegalAction[]): { kind: "check" } | { kind: "call" } | { kind: "fold" } {
  if (legal.some((l) => l.kind === "check")) return { kind: "check" }
  if (legal.some((l) => l.kind === "call")) return { kind: "call" }
  return { kind: "fold" }
}

export async function tableHasHuman(db: Db, tableId: string): Promise<boolean> {
  const rows = await db
    .select({ agent_id: tableSeats.agent_id, persona: agentsTable.persona })
    .from(tableSeats)
    .leftJoin(agentsTable, eq(agentsTable.id, tableSeats.agent_id))
    .where(eq(tableSeats.table_id, tableId))
  return rows.some((r) => !(r.persona ?? "").startsWith("house-bot:"))
}

/** Retained as a small helper for unit testing the idle-window math + DB check. */
export async function shouldIdlePause(
  deps: { db: Db; tableId: string; idlePauseMs: number },
  idleSince: number | null,
): Promise<boolean> {
  if (idleSince === null) return false
  if (Date.now() - idleSince < deps.idlePauseMs) return false
  return !(await tableHasHuman(deps.db, deps.tableId))
}
