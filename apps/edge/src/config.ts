export const STARTING_CHIPS = 1000
export const BLINDS = { sb: 10, bb: 20 } as const
export const BOT_ACT_DELAY_MS = 500
export const AGENT_GRACE_MS = 30_000
export const IDLE_HIBERNATE_MS = 5 * 60 * 1000

export interface DemoTableConfig {
  kind: "demo"
  room: "demo-1" | "demo-2" | "demo-3"
  botSeats: Array<{ seat: number; name: string }>
  openSeat: number
}

export const DEMO_TABLES: Record<"demo-1" | "demo-2" | "demo-3", DemoTableConfig> = {
  "demo-1": {
    kind: "demo", room: "demo-1",
    botSeats: [
      { seat: 0, name: "RandomBot-Alpha" },
      { seat: 1, name: "RandomBot-Bravo" },
      { seat: 2, name: "RandomBot-Charlie" },
    ],
    openSeat: 3,
  },
  "demo-2": {
    kind: "demo", room: "demo-2",
    botSeats: [
      { seat: 0, name: "RandomBot-Delta" },
      { seat: 1, name: "RandomBot-Echo" },
      { seat: 2, name: "RandomBot-Foxtrot" },
    ],
    openSeat: 3,
  },
  "demo-3": {
    kind: "demo", room: "demo-3",
    botSeats: [
      { seat: 0, name: "RandomBot-Golf" },
      { seat: 1, name: "RandomBot-Hotel" },
      { seat: 2, name: "RandomBot-India" },
    ],
    openSeat: 3,
  },
}

export function isDemoRoom(room: string): room is keyof typeof DEMO_TABLES {
  return room in DEMO_TABLES
}
