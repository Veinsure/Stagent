"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TableView } from "@/components/TableView"
import { RightColumn } from "@/components/right-column/RightColumn"
import { getReplay, HttpError, type ReplayDetail } from "@/lib/api"
import type { GameEvent } from "@/lib/ws-client"
import { Play, Pause, ChevronRight } from "lucide-react"

const TICK_MS = 400

interface Props { id: string }

export function ReplayClient({ id }: Props) {
  const [replay, setReplay] = useState<ReplayDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    getReplay(id)
      .then(r => setReplay(r))
      .catch(e => {
        if (e instanceof HttpError && e.status === 404) setError("回放不存在或没有权限查看")
        else setError("加载失败")
      })
  }, [id])

  useEffect(() => {
    if (!playing || !replay) return
    if (cursor >= replay.events.length) { setPlaying(false); return }
    const t = setTimeout(() => setCursor(c => c + 1), TICK_MS)
    return () => clearTimeout(t)
  }, [playing, cursor, replay])

  if (error) return <div className="p-12 text-center"><p>{error}</p><Link href="/" className="text-accent text-sm">返回首页</Link></div>
  if (!replay) return <div className="p-6 text-text-muted text-sm">loading…</div>

  const visible = replay.events.slice(0, cursor) as GameEvent[]
  const snapshot = (visible.find(e => e.type === "snapshot") as any)?.state ?? null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_340px] h-full">
      <div className="overflow-y-auto">
        <header className="px-6 py-3 bg-bg-surface border-b border-border flex items-center gap-3">
          <Link href="/" className="text-xs text-text-muted hover:text-accent">← 首页</Link>
          <div className="text-sm">
            <span className="font-semibold">/c/{replay.room}</span>
            <span className="text-text-muted">
              {" "}· {replay.hands_count} 手 · {new Date(replay.started_at).toLocaleString()}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPlaying(p => !p)}
              className="p-1.5 rounded border border-border hover:border-accent"
              title={playing ? "暂停" : "播放"}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => setCursor(c => Math.min(c + 1, replay.events.length))}
              className="p-1.5 rounded border border-border hover:border-accent"
              title="下一步"
            >
              <ChevronRight size={14} />
            </button>
            <span className="text-xs text-text-muted ml-2">
              {cursor} / {replay.events.length}
            </span>
          </div>
        </header>
        <TableView room={replay.room} snapshot={snapshot} />
      </div>
      <aside className="border-l border-border bg-bg-surface min-h-0">
        <RightColumn events={visible} />
      </aside>
    </div>
  )
}
