"use client"

import { Avatar } from "@/components/Avatar"
import { PlayingCard } from "@/components/PlayingCard"
import { ChipStack } from "@/components/ChipStack"
import { agentTheme, nameToHue } from "@/lib/agent-color"

interface SeatView {
  kind: "empty" | "bot" | "agent"
  name?: string
  chips?: number
}

interface CardView { rank: string; suit: string }

interface EngineView {
  street: string
  pot_main: number
  current_bet: number
  to_act: number | null
  board: CardView[]
  seats: Array<{ agent_id: string; chips: number; status: string; index: number }>
}

interface Snapshot {
  kind: "demo" | "private"
  room: string
  seats: SeatView[]
  engine: EngineView | null
  handsPlayed: number
}

export type RevealMap = Record<number, CardView[]>

interface Props {
  room: string
  snapshot: Snapshot | null
  revealMap?: RevealMap
}

// Compute seat positions around an ellipse.
// Container aspect: 760×440px. Center at (50%, 50%).
// rx=36% of width, ry=36% of height, angles start from top going clockwise.
function getSeatPosition(idx: number, total: number): { x: number; y: number } {
  const startAngle = -Math.PI / 2
  const angle = startAngle + (idx / total) * 2 * Math.PI
  const rx = 36
  const ry = 36
  return {
    x: 50 + rx * Math.cos(angle),
    y: 50 + ry * Math.sin(angle),
  }
}

function toActDoIdxToSeatIdx(seats: SeatView[], engineToAct: number | null): number | null {
  if (engineToAct === null) return null
  let cur = -1
  for (let i = 0; i < seats.length; i++) {
    if (seats[i]!.kind !== "empty") {
      cur++
      if (cur === engineToAct) return i
    }
  }
  return null
}

function SeatCard({
  seat,
  isToAct,
  label,
  hole,
}: {
  seat: SeatView
  isToAct: boolean
  label: string
  hole: CardView[] | null
}) {
  const empty = seat.kind === "empty"
  const name = seat.name ?? ""
  const theme = empty ? null : agentTheme(name)

  const ringStyle = empty
    ? { boxShadow: "inset 0 0 0 1px rgb(63 63 70)" }
    : isToAct
    ? { boxShadow: `0 0 0 2px hsl(48 96% 60%), 0 0 14px hsl(48 96% 60% / 0.7)` }
    : { boxShadow: `inset 0 0 0 2px ${theme!.ring}` }

  return (
    <div
      className="w-32 px-2 py-2 bg-twitch-surface rounded-lg flex flex-col items-center gap-1"
      style={ringStyle}
    >
      <div className="text-[9px] uppercase tracking-wider text-twitch-muted">{label}</div>

      {empty ? (
        <>
          <div className="w-9 h-9 rounded-full bg-twitch-border/40" />
          <div className="text-xs text-twitch-muted">empty</div>
        </>
      ) : (
        <>
          <Avatar
            name={name}
            size={36}
            className="border-2"
            style={{ borderColor: theme!.ring }}
          />
          <div className="text-xs font-semibold truncate max-w-full" title={name}>
            {name}
          </div>
          <div className="text-[9px] uppercase tracking-wide" style={{ color: theme!.ring }}>
            {seat.kind === "agent" ? "agent" : "bot"}
          </div>

          <div className="flex gap-0.5 mt-0.5">
            {hole && hole.length === 2 ? (
              hole.map((c, i) => <PlayingCard key={i} rank={c.rank} suit={c.suit} size="sm" />)
            ) : (
              <>
                <PlayingCard faceDown hue={theme!.hue} size="sm" />
                <PlayingCard faceDown hue={theme!.hue} size="sm" />
              </>
            )}
          </div>

          <div className="mt-0.5 flex flex-col items-center gap-0.5">
            <div className="text-[9px] text-twitch-muted">chips</div>
            <ChipStack amount={seat.chips ?? 0} size="sm" />
          </div>
        </>
      )}
    </div>
  )
}

export function TableView({ room, snapshot, revealMap }: Props) {
  if (!snapshot) {
    return (
      <div className="p-6 text-twitch-muted">
        Connecting to <code>{room}</code>…
      </div>
    )
  }

  const engine = snapshot.engine
  const toActSeatIdx = toActDoIdxToSeatIdx(snapshot.seats, engine?.to_act ?? null)
  const seats = snapshot.seats

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-bold">{room}</h1>
          <div className="text-xs text-twitch-muted">
            {snapshot.kind === "demo" ? "demo table" : "private table"} · hand #{snapshot.handsPlayed}
          </div>
        </div>
        {engine && (
          <div className="text-xs text-twitch-muted text-right">
            <div>street: <span className="text-twitch-text">{engine.street}</span></div>
            <div>{seats.filter(s => s.kind !== "empty").length} / {seats.length} seats</div>
          </div>
        )}
      </div>

      {/* Poker table — oval layout */}
      <div
        className="relative mx-auto w-full select-none"
        style={{ maxWidth: 760, paddingBottom: "57.9%" /* 440/760 */ }}
      >
        <div className="absolute inset-0">
          {/* Felt oval */}
          <div
            className="absolute rounded-[50%] bg-gradient-to-b from-emerald-900/70 to-emerald-950/80 border-4 border-emerald-700/30 shadow-inner"
            style={{ left: "14%", right: "14%", top: "12%", bottom: "12%" }}
          />

          {/* Board + pot centered */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5">
              {engine?.board?.length ? (
                engine.board.map((c, i) => (
                  <PlayingCard key={i} rank={c.rank} suit={c.suit} size="md" />
                ))
              ) : (
                [0, 1, 2, 3, 4].map((i) => (
                  <PlayingCard key={i} faceDown size="md" />
                ))
              )}
            </div>
            {engine && (
              <div className="flex gap-4 text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-twitch-muted">pot</div>
                  <ChipStack amount={engine.pot_main} size="sm" />
                </div>
                {engine.current_bet > 0 && (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="text-[9px] uppercase tracking-wider text-twitch-muted">bet</div>
                    <ChipStack amount={engine.current_bet} size="sm" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seats around the oval */}
          {seats.map((s, i) => {
            const pos = getSeatPosition(i, seats.length)
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <SeatCard
                  seat={s}
                  isToAct={i === toActSeatIdx}
                  label={`seat ${i}`}
                  hole={revealMap?.[i] ?? null}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

void nameToHue
