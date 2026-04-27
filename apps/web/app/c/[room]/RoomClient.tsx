"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { TableView } from "@/components/TableView"
import { RightColumn } from "@/components/right-column/RightColumn"
import { LeaveModal } from "@/components/LeaveModal"
import { openRoomSocket, type GameEvent, type WsClient } from "@/lib/ws-client"
import { newBuffer, appendEvent, eligibleForReplay, uploadReplayBeacon, type ReplayBufferState } from "@/lib/replay-buffer"
import { me } from "@/lib/api"

const EDGE_URL = process.env.NEXT_PUBLIC_EDGE_URL ?? "http://localhost:8787"

interface Props { room: string }

export function RoomClient({ room }: Props) {
  const router = useRouter()
  const [snapshot, setSnapshot] = useState<any>(null)
  const [events, setEvents] = useState<GameEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const wsRef = useRef<WsClient | null>(null)
  const bufferRef = useRef<ReplayBufferState>(newBuffer())

  useEffect(() => {
    me().then(u => setIsLoggedIn(!!u)).catch(() => setIsLoggedIn(false))
  }, [])

  useEffect(() => {
    bufferRef.current = newBuffer()
    const client = openRoomSocket(EDGE_URL, room, (e) => {
      bufferRef.current = appendEvent(bufferRef.current, e)
      if (e.type === "snapshot") {
        setSnapshot(e.state)
        setConnected(true)
      } else if (e.type === "seat_update") {
        setSnapshot((prev: any) => {
          if (!prev) return prev
          const seats = [...prev.seats]
          if (e.kind === "empty") seats[e.seat] = { kind: "empty" }
          else if (e.kind === "bot") seats[e.seat] = { kind: "bot", name: e.name, chips: 1000 }
          else if (e.kind === "agent") seats[e.seat] = { kind: "agent", name: e.name, chips: 1000 }
          return { ...prev, seats }
        })
      }
      setEvents((prev) => {
        const next = [...prev, e]
        return next.length > 500 ? next.slice(next.length - 500) : next
      })
    })
    wsRef.current = client
    return () => client.close()
  }, [room])

  useEffect(() => {
    const onBeforeUnload = () => {
      if (isLoggedIn && eligibleForReplay(bufferRef.current)) {
        uploadReplayBeacon({
          room, roomKind: room.startsWith("demo-") ? "demo" : "private",
          buf: bufferRef.current, visibility: "private",
        })
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [room, isLoggedIn])

  function handleLeaveClick() {
    if (eligibleForReplay(bufferRef.current)) {
      setShowLeaveModal(true)
    } else {
      router.push("/")
    }
  }

  function handleSave(visibility: "public" | "private") {
    uploadReplayBeacon({
      room, roomKind: room.startsWith("demo-") ? "demo" : "private",
      buf: bufferRef.current, visibility,
    })
    setShowLeaveModal(false)
    router.push("/me/replays")
  }

  function handleSkip() {
    setShowLeaveModal(false)
    router.push("/")
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_340px] h-full">
      <div className="overflow-y-auto">
        <div className="p-2 flex justify-end">
          <button
            onClick={handleLeaveClick}
            className="px-3 py-1 rounded text-xs text-text-muted hover:text-text-primary border border-border hover:border-border-strong"
          >
            离开桌子
          </button>
        </div>
        <TableView room={room} snapshot={snapshot} />
        {!connected && (
          <div className="px-6 text-xs text-text-muted">
            waiting for first snapshot from <code>{EDGE_URL}</code>…
          </div>
        )}
      </div>
      <aside className="border-l border-border bg-bg-surface min-h-0">
        <RightColumn events={events} />
      </aside>
      <LeaveModal
        open={showLeaveModal}
        isLoggedIn={isLoggedIn}
        handsCount={bufferRef.current.handsCount}
        onSave={handleSave}
        onSkip={handleSkip}
      />
    </div>
  )
}
