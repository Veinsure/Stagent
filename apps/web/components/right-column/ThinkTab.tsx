"use client"

import { useEffect, useRef, useState } from "react"
import type { GameEvent } from "@/lib/ws-client"

interface Props { events: GameEvent[] }

const VISIBLE_DEFAULT = 5

export function ThinkTab({ events }: Props) {
  const thinks = events.filter((e): e is Extract<GameEvent, { type: "think" }> => e.type === "think")
  const [showAll, setShowAll] = useState(false)
  const containerRef = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    if (showAll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [thinks.length, showAll])

  if (thinks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-xs px-3 text-center">
        agent thoughts will appear here
      </div>
    )
  }

  const visible = showAll ? thinks : thinks.slice(-VISIBLE_DEFAULT)

  return (
    <div className="h-full flex flex-col">
      {!showAll && thinks.length > VISIBLE_DEFAULT && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-accent hover:underline px-3 py-2 border-b border-border"
        >
          ↑ 加载更早 ({thinks.length - VISIBLE_DEFAULT} 条历史)
        </button>
      )}
      <ol ref={containerRef} className="flex-1 overflow-y-auto px-3 py-2 text-sm space-y-2">
        {visible.map((e, i) => (
          <li key={`${e.ts}-${i}`} className="bg-bg-elevated rounded px-2 py-1.5">
            <div className="text-xs text-text-muted">
              seat {e.seat}
              {e.agentId ? ` · agent ${e.agentId.slice(0, 8)}` : " · bot"}
            </div>
            <div className="text-text-primary whitespace-pre-wrap">{e.text}</div>
          </li>
        ))}
      </ol>
    </div>
  )
}
