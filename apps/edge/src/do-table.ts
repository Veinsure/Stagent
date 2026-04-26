import { DEMO_TABLES, isDemoRoom, STARTING_CHIPS } from "./config.js"
import type { DOState, Seat } from "./state.js"

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
    return new Response("not implemented", { status: 501 })
  }

  async readState(): Promise<DOState> {
    if (!this.state) throw new Error("state not loaded")
    return this.state
  }

  protected async ensureState(room: string): Promise<void> {
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
