import { BOT_ACT_DELAY_MS, DEMO_TABLES, isDemoRoom, STARTING_CHIPS } from "./config.js"
import type { DOState, Seat } from "./state.js"
import { advanceBotsOnly, engineSeatToDoSeat, refillBankrupt, startHand } from "./game-loop.js"

const STATE_KEY = "state"

export class TableDO {
  protected state: DOState | null = null

  constructor(protected ctx: DurableObjectState, protected env: unknown) {}

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const parts = url.pathname.split("/").filter(Boolean)
    const room = parts[1]
    if (!room) return new Response("missing room", { status: 400 })
    await this.ensureState(room)

    if (parts[2] === "__init") return new Response("ok")
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
    return new Response("not implemented", { status: 501 })
  }

  async alarm(): Promise<void> {
    const s = await this.readState()
    if (!s.engine) return
    const next = advanceBotsOnly(s, () => Math.random())

    let after: DOState
    if (next.engine?.street === "showdown") {
      const refilled = refillBankrupt(next)
      after = startHand(refilled, { seed: `seed-${Date.now()}-${next.handsPlayed}` })
    } else {
      after = next
    }
    await this.writeState(after)

    const live = after.engine
    if (live && live.street !== "showdown" && live.to_act !== null) {
      const doIdx = engineSeatToDoSeat(after, live.to_act)
      const seat = after.seats[doIdx]
      if (seat?.kind === "bot") {
        await this.ctx.storage.setAlarm(Date.now() + BOT_ACT_DELAY_MS)
      }
    }
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
      const seats: Seat[] = Array.from({ length: 4 }, (_, i) => {
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
      { kind: "bot", name: "RandomBot-2", chips: STARTING_CHIPS },
      { kind: "bot", name: "RandomBot-3", chips: STARTING_CHIPS },
    ]
    return { kind: "private", room, seats, engine: null, handsPlayed: 0, actionLog: [], lastActivityMs: Date.now() }
  }
}
