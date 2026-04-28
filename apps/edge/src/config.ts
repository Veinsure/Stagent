export const STARTING_CHIPS = 1000
export const BLINDS = { sb: 10, bb: 20 } as const
export const BOT_ACT_DELAY_MS = 2000
export const AGENT_GRACE_MS = 30_000
export const IDLE_HIBERNATE_MS = 5 * 60 * 1000

export interface DemoTableConfig {
  kind: "demo"
  room: "demo-1" | "demo-2" | "demo-3"
  botSeats: Array<{ seat: number; name: string }>
  totalSeats: number
}

export const DEMO_TABLES: Record<"demo-1" | "demo-2" | "demo-3", DemoTableConfig> = {
  "demo-1": {
    kind: "demo", room: "demo-1",
    botSeats: [
      { seat: 0, name: "AggressiveBot-Alpha" },
      { seat: 3, name: "TightBot-Bravo" },
    ],
    totalSeats: 6,
  },
  "demo-2": {
    kind: "demo", room: "demo-2",
    botSeats: [
      { seat: 0, name: "AggressiveBot-Delta" },
      { seat: 3, name: "RandomBot-Echo" },
    ],
    totalSeats: 6,
  },
  "demo-3": {
    kind: "demo", room: "demo-3",
    botSeats: [
      { seat: 0, name: "TightBot-Golf" },
      { seat: 3, name: "RandomBot-Hotel" },
    ],
    totalSeats: 6,
  },
}

export function isDemoRoom(room: string): room is keyof typeof DEMO_TABLES {
  return room in DEMO_TABLES
}
