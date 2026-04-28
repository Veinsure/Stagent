import { AGENT_GRACE_MS, BOT_ACT_DELAY_MS, DEMO_TABLES, IDLE_HIBERNATE_MS, isDemoRoom, STARTING_CHIPS } from "./config.js"
import type { DOState, Seat } from "./state.js"
import { publicView } from "./state.js"
import { advanceBotsOnly, advanceBotsOnce, engineSeatToDoSeat, refillBankrupt, startHand } from "./game-loop.js"
import { broadcastEvent, handleWsUpgrade } from "./ws-handler.js"
import { handleMcpRequest } from "./mcp-handler.js"
import { actInput, sayInput, sitDownInput, thinkInput } from "./mcp-schemas.js"
import { TexasHoldemModule } from "@stagent/texas-holdem"
import type { AgentContext } from "./auth/bearer.js"
import { putPresence, deletePresence } from "./presence.js"

const STATE_KEY = "state"

interface DOEnv {
  DB: D1Database
  PRESENCE: KVNamespace
  ANTHROPIC_API_KEY?: string
}

export class TableDO {
  protected state: DOState | null = null

  constructor(protected ctx: DurableObjectState, protected env: DOEnv) {}

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const parts = url.pathname.split("/").filter(Boolean)
    const room = parts[1]
    if (!room) return new Response("missing room", { status: 400 })
    await this.ensureState(room)

    if (parts[2] === "mcp") {
      const s = await this.readState()
      if (s.ownerToken) {
        const t = new URL(req.url).searchParams.get("t")
        if (!t || t !== s.ownerToken) {
          return new Response("unauthorized", { status: 403 })
        }
      }
      const { lookupAgentByBearer, touchAgentLastUsed } = await import("./auth/bearer.js")
      const agentCtx = await lookupAgentByBearer(req, this.env)
      if (agentCtx) await touchAgentLastUsed(this.env, agentCtx.agentId)
      return handleMcpRequest(req, {
        getSessionId: () => req.headers.get("Mcp-Session-Id"),
        newSessionId: () => crypto.randomUUID(),
        agent: agentCtx,
        callTool: (name, args, sid, agent) => this.callMcpTool(name, args, sid, agent),
      })
    }
    if (parts[2] === "ws") {
      if (req.headers.get("Upgrade") !== "websocket") {
        return new Response("expected ws upgrade", { status: 426 })
      }
      const res = handleWsUpgrade(this.ctx)
      const s = await this.readState()
      queueMicrotask(() => broadcastEvent(this.ctx, { type: "snapshot", state: publicView(s) }))
      return res
    }
    if (parts[2] === "__init") return new Response("ok")
    if (parts[2] === "__initPrivate") {
      const token = req.headers.get("X-Owner-Token")
      if (!token) return new Response("missing token", { status: 400 })
      const s = await this.readState()
      await this.writeState({ ...s, ownerToken: token })
      return new Response("ok")
    }
    if (parts[2] === "__startHand") {
      const s = await this.readState()
      const next = startHand(s, { seed: `seed-${Date.now()}` })
      await this.writeState(next)
      await this.ctx.storage.setAlarm(Date.now() + BOT_ACT_DELAY_MS)
      return new Response("ok")
    }
    if (parts[2] === "__tick") {
      await this.alarm()
      return new Response("ok")
    }
    if (parts[2] === "__reapIdle") {
      await this.reapIdleAgents()
      return new Response("ok")
    }
    if (parts[2] === "__checkIdle") {
      await this.checkIdle()
      return new Response("ok")
    }
    return new Response("not implemented", { status: 501 })
  }

  protected async checkIdle(): Promise<void> {
    const stored = await this.ctx.storage.get<DOState>(STATE_KEY)
    if (!stored) return
    const activeAgents = stored.seats.some(x => x.kind === "agent")
    const activeWs = this.ctx.getWebSockets("viewer").length > 0
    if (activeAgents || activeWs) return
    if (Date.now() - stored.lastActivityMs < IDLE_HIBERNATE_MS) return
    await this.ctx.storage.deleteAll()
    this.state = null
  }

  protected async reapIdleAgents(): Promise<void> {
    const s = await this.readState()
    const now = Date.now()
    const next: DOState = { ...s, seats: [...s.seats] }
    let changed = false
    for (let i = 0; i < next.seats.length; i++) {
      const seat = next.seats[i]
      if (!seat || seat.kind !== "agent") continue
      if (now - seat.lastSeenMs < AGENT_GRACE_MS) continue
      changed = true
      if (seat.userId && seat.agentId) {
        await deletePresence(this.env.PRESENCE, seat.userId, seat.agentId)
      }
      if (s.kind === "demo") {
        next.seats[i] = { kind: "empty" }
        broadcastEvent(this.ctx, { type: "seat_update", seat: i, kind: "empty" })
      } else {
        const botName = `RandomBot-${i}`
        next.seats[i] = { kind: "bot", name: botName, chips: seat.chips }
        broadcastEvent(this.ctx, { type: "seat_update", seat: i, kind: "bot", name: botName })
      }
    }
    if (changed) await this.writeState(next)
  }

  async alarm(): Promise<void> {
    await this.reapIdleAgents()
    const s = await this.readState()

    if (!s.engine) {
      if (s.seats.some(seat => seat.kind === "agent")) {
        await this.ctx.storage.setAlarm(Date.now() + AGENT_GRACE_MS / 2)
      }
      return
    }

    const { state: advanced, step } = await advanceBotsOnce(s, () => Math.random(), this.env.ANTHROPIC_API_KEY)

    if (step) {
      broadcastEvent(this.ctx, {
        type: "think", seat: step.doIdx,
        agentId: null, text: step.reasoning, ts: Date.now(),
      })
      broadcastEvent(this.ctx, {
        type: "action",
        seat: step.doIdx,
        action: step.action.kind,
        ...(step.action.amount !== undefined ? { amount: step.action.amount } : {}),
      })
    }

    let after: DOState
    if (advanced.engine?.street === "showdown") {
      broadcastEvent(this.ctx, { type: "showdown", winners: [], reveal: {} })
      const refilled = refillBankrupt(advanced)
      after = startHand(refilled, { seed: `seed-${Date.now()}-${advanced.handsPlayed}` })
      broadcastEvent(this.ctx, {
        type: "hand_start",
        handId: after.handsPlayed,
        dealer: after.engine?.button ?? 0,
      })
    } else {
      after = advanced
    }
    await this.writeState(after)

    for (const seat of after.seats) {
      if (seat.kind === "agent" && seat.userId && seat.agentId) {
        await putPresence(this.env.PRESENCE, seat.userId, seat.agentId, {
          room: after.room, sinceTs: seat.lastSeenMs, agentName: seat.name,
        })
      }
    }

    const live = after.engine
    if (live && live.street !== "showdown" && live.to_act !== null) {
      const doIdx = engineSeatToDoSeat(after, live.to_act)
      const nextSeat = after.seats[doIdx]
      if (nextSeat?.kind === "bot") {
        await this.ctx.storage.setAlarm(Date.now() + BOT_ACT_DELAY_MS)
        return
      }
    }

    // No bot pending — keep heartbeat alive for agent presence reaping
    if (after.seats.some(seat => seat.kind === "agent")) {
      await this.ctx.storage.setAlarm(Date.now() + AGENT_GRACE_MS / 2)
    }
  }

  async webSocketMessage(_ws: WebSocket, _msg: string | ArrayBuffer): Promise<void> {}
  async webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {}

  protected async callMcpTool(name: string, args: any, sid: string, agent: AgentContext | null): Promise<any> {
    const s = await this.readState()

    if (name === "sit_down") {
      const { name: agentName } = sitDownInput.parse(args)
      const mySeat = s.seats.findIndex(
        seat => seat.kind === "agent" && seat.mcpSessionId === sid,
      )
      if (mySeat >= 0) return { seat: mySeat, note: "already seated" }

      const openIdx = s.seats.findIndex(seat => seat.kind === "empty")
      if (openIdx < 0) throw new Error("seat_taken")

      const displayName = agent?.name ?? agentName ?? `guest-${sid.slice(0, 4)}`

      const next: DOState = { ...s, seats: [...s.seats] }
      next.seats[openIdx] = {
        kind: "agent",
        name: displayName,
        chips: STARTING_CHIPS,
        mcpSessionId: sid,
        lastSeenMs: Date.now(),
        userId: agent?.userId ?? null,
        agentId: agent?.agentId ?? null,
        avatarUrl: agent?.avatarUrl ?? null,
        color: agent?.color ?? null,
      }
      next.lastActivityMs = Date.now()
      await this.writeState(next)
      broadcastEvent(this.ctx, { type: "seat_update", seat: openIdx, kind: "agent", name: displayName })

      if (agent) {
        await putPresence(this.env.PRESENCE, agent.userId, agent.agentId, {
          room: s.room, sinceTs: Date.now(), agentName: agent.name,
        })
      }

      const seated = next.seats.filter(x => x.kind !== "empty").length
      if (seated >= 2 && !next.engine) {
        const started = startHand(next, { seed: `seed-${Date.now()}` })
        await this.writeState(started)
        await this.ctx.storage.setAlarm(Date.now() + BOT_ACT_DELAY_MS)
      } else {
        // Heartbeat alarm so the agent's seat is reaped if they go silent
        await this.ctx.storage.setAlarm(Date.now() + AGENT_GRACE_MS)
      }
      return { seat: openIdx }
    }

    if (name === "leave_table") {
      const mySeat = s.seats.findIndex(seat => seat.kind === "agent" && seat.mcpSessionId === sid)
      if (mySeat < 0) return { ok: true, note: "not_seated" }
      const leaving = s.seats[mySeat]!
      if (leaving.kind === "agent" && leaving.userId && leaving.agentId) {
        await deletePresence(this.env.PRESENCE, leaving.userId, leaving.agentId)
      }
      const next: DOState = { ...s, seats: [...s.seats] }
      next.seats[mySeat] = { kind: "empty" }
      await this.writeState(next)
      broadcastEvent(this.ctx, { type: "seat_update", seat: mySeat, kind: "empty" })
      return { ok: true }
    }

    if (name === "act") {
      const parsed = actInput.parse(args)
      const action = parsed.action
      if (!s.engine) throw new Error("no_hand_in_progress")

      const mySeat = s.seats.findIndex(seat => seat.kind === "agent" && seat.mcpSessionId === sid)
      if (mySeat < 0) throw new Error("not_seated")

      let myEngineIdx = -1
      for (let i = 0; i < s.engine.seats.length; i++) {
        if (engineSeatToDoSeat(s, i) === mySeat) { myEngineIdx = i; break }
      }
      if (myEngineIdx < 0) throw new Error("seat_mapping_error")
      if (s.engine.to_act !== myEngineIdx) throw new Error("not_your_turn")

      const myEngineSeat = s.engine.seats[myEngineIdx]!
      const by = myEngineSeat.agent_id
      const legal = TexasHoldemModule.legalActions(s.engine, by)
      const matches = legal.find(la => la.kind === action)
      if (!matches) throw new Error("illegal_action")

      const engineAction =
        action === "raise"
          ? { kind: "raise" as const, amount: parsed.amount ?? (matches as { kind: "raise"; min: number }).min }
          : action === "fold"
          ? { kind: "fold" as const }
          : action === "check"
          ? { kind: "check" as const }
          : action === "call"
          ? { kind: "call" as const }
          : { kind: "all_in" as const }

      const result = TexasHoldemModule.applyAction(s.engine, engineAction, by)
      const me = s.seats[mySeat]
      const updatedSeats = [...s.seats]
      if (me?.kind === "agent") updatedSeats[mySeat] = { ...me, lastSeenMs: Date.now() }

      const afterAct: DOState = { ...s, seats: updatedSeats, engine: result.state, lastActivityMs: Date.now() }
      if (parsed.reasoning) {
        broadcastEvent(this.ctx, {
          type: "think", seat: mySeat,
          agentId: agent?.agentId ?? null,
          text: parsed.reasoning, ts: Date.now(),
        })
      }
      broadcastEvent(this.ctx, {
        type: "action", seat: mySeat, action,
        ...(parsed.amount !== undefined ? { amount: parsed.amount } : {}),
      })

      let final: DOState
      if (afterAct.engine?.street === "showdown") {
        broadcastEvent(this.ctx, { type: "showdown", winners: [], reveal: {} })
        const refilled = refillBankrupt(afterAct)
        final = startHand(refilled, { seed: `seed-${Date.now()}-${afterAct.handsPlayed}` })
        broadcastEvent(this.ctx, {
          type: "hand_start", handId: final.handsPlayed, dealer: final.engine?.button ?? 0,
        })
      } else {
        final = afterAct
      }
      await this.writeState(final)

      if (final.engine && final.engine.street !== "showdown" && final.engine.to_act !== null) {
        const nextDoIdx = engineSeatToDoSeat(final, final.engine.to_act)
        if (final.seats[nextDoIdx]?.kind === "bot") {
          await this.ctx.storage.setAlarm(Date.now() + BOT_ACT_DELAY_MS)
        }
      }
      return { ok: true }
    }

    if (name === "say") {
      const { text } = sayInput.parse(args)
      const mySeat = s.seats.findIndex(seat => seat.kind === "agent" && seat.mcpSessionId === sid)
      if (mySeat < 0) throw new Error("not_seated")
      broadcastEvent(this.ctx, { type: "say", seat: mySeat, text })
      return { ok: true }
    }

    if (name === "think") {
      const { text } = thinkInput.parse(args)
      const mySeat = s.seats.findIndex(seat => seat.kind === "agent" && seat.mcpSessionId === sid)
      if (mySeat < 0) throw new Error("not_seated")
      broadcastEvent(this.ctx, {
        type: "think", seat: mySeat,
        agentId: agent?.agentId ?? null,
        text, ts: Date.now(),
      })
      return { ok: true }
    }

    if (name === "get_state") {
      const mySeat = s.seats.findIndex(seat => seat.kind === "agent" && seat.mcpSessionId === sid)
      if (mySeat < 0) throw new Error("not_seated")

      const me = s.seats[mySeat]
      if (!me || me.kind !== "agent") throw new Error("not_seated")

      const updated: DOState = { ...s, seats: [...s.seats] }
      updated.seats[mySeat] = { ...me, lastSeenMs: Date.now() }
      updated.lastActivityMs = Date.now()
      await this.writeState(updated)

      if (!updated.engine) {
        return { phase: "waiting_for_hand", seats: updated.seats, chips: me.chips, legalActions: [] }
      }

      let myEngineIdx = -1
      for (let i = 0; i < updated.engine.seats.length; i++) {
        if (engineSeatToDoSeat(updated, i) === mySeat) { myEngineIdx = i; break }
      }
      if (myEngineIdx < 0) throw new Error("seat_mapping_error")
      const myEngineSeat = updated.engine.seats[myEngineIdx]!
      const by = myEngineSeat.agent_id
      const redacted = TexasHoldemModule.redactForAgent(updated.engine, by)
      const isMyTurn = updated.engine.to_act === myEngineIdx
      const legal = isMyTurn ? TexasHoldemModule.legalActions(updated.engine, by) : []

      return {
        phase: updated.engine.street,
        holeCards: myEngineSeat.hole_cards,
        board: updated.engine.board,
        pot: updated.engine.pot_main,
        toCall: Math.max(0, updated.engine.current_bet - myEngineSeat.contributed_this_street),
        chips: myEngineSeat.chips,
        legalActions: legal,
        engine: redacted,
      }
    }

    throw new Error(`tool ${name} not implemented`)
  }

  async readState(): Promise<DOState> {
    if (!this.state) throw new Error("state not loaded")
    return this.state
  }

  async writeState(next: DOState): Promise<void> {
    this.state = next
    await this.ctx.storage.put(STATE_KEY, next)
  }

  dropCachedState(): void {
    this.state = null
  }

  async ensureState(room: string): Promise<void> {
    if (this.state) return
    const stored = await this.ctx.storage.get<DOState>(STATE_KEY)
    if (stored) { this.state = stored; return }
    this.state = this.initState(room)
    await this.ctx.storage.put(STATE_KEY, this.state)
  }

  private initState(room: string): DOState {
    if (isDemoRoom(room)) {
      const cfg = DEMO_TABLES[room]
      const seats: Seat[] = Array.from({ length: cfg.totalSeats }, (_, i) => {
        const bot = cfg.botSeats.find((b) => b.seat === i)
        return bot
          ? { kind: "bot", name: bot.name, chips: STARTING_CHIPS }
          : { kind: "empty" }
      })
      return { kind: "demo", room, seats, engine: null, handsPlayed: 0, actionLog: [], lastActivityMs: Date.now() }
    }
    const seats: Seat[] = [
      { kind: "empty" },
      { kind: "bot", name: "RandomBot-1", chips: STARTING_CHIPS },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "bot", name: "RandomBot-2", chips: STARTING_CHIPS },
      { kind: "empty" },
    ]
    return { kind: "private", room, seats, engine: null, handsPlayed: 0, actionLog: [], lastActivityMs: Date.now() }
  }
}
