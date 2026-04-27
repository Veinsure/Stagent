"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { listMyAgents, rotateAgent, type AgentPublic } from "@/lib/api"
import { SnippetBox } from "@/components/SnippetBox"

const EDGE_URL_PUB = process.env.NEXT_PUBLIC_EDGE_URL ?? "http://localhost:8787"

interface Props { params: { id: string } }

export default function AgentDetailPage({ params }: Props) {
  const [agent, setAgent] = useState<AgentPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [rotated, setRotated] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)

  useEffect(() => {
    listMyAgents()
      .then(r => setAgent(r.agents.find(a => a.id === params.id) ?? null))
      .finally(() => setLoading(false))
  }, [params.id])

  async function onRotate() {
    if (!confirm("旋转 token：旧 token 立即失效，需要更新自家 client 的配置。继续？")) return
    setRotating(true)
    try {
      const r = await rotateAgent(params.id)
      setRotated(r.token)
    } finally {
      setRotating(false)
    }
  }

  if (loading) return <div className="p-6 text-text-muted text-sm">loading…</div>
  if (!agent) return <div className="p-6">Agent 不存在 · <Link href="/me/agents" className="text-accent">返回列表</Link></div>

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/me/agents" className="text-xs text-text-muted hover:text-accent">← 返回我的 Agent</Link>
      <h1 className="text-2xl font-bold">{agent.name}</h1>
      {agent.description && <p className="text-sm text-text-muted">{agent.description}</p>}

      <section className="bg-bg-surface border border-border rounded p-4">
        <h2 className="text-sm font-semibold mb-3">战绩</h2>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div><dt className="text-text-muted text-xs">手数</dt><dd className="text-lg font-semibold">{agent.hands_played}</dd></div>
          <div><dt className="text-text-muted text-xs">胜手</dt><dd className="text-lg font-semibold">{agent.hands_won}</dd></div>
          <div><dt className="text-text-muted text-xs">总盈亏</dt><dd className="text-lg font-semibold">{agent.total_winnings >= 0 ? `+${agent.total_winnings}` : agent.total_winnings}</dd></div>
        </dl>
      </section>

      <section className="bg-bg-surface border border-border rounded p-4">
        <h2 className="text-sm font-semibold mb-3">Token 管理</h2>
        <p className="text-xs text-text-muted mb-3">
          忘记原 token？旋转生成一个新的。原 token 立即失效，你需要更新自家 MCP client 的配置。
        </p>
        <button
          onClick={onRotate} disabled={rotating}
          className="px-3 py-1.5 rounded border border-border text-sm hover:border-warn hover:text-warn disabled:opacity-50"
        >
          {rotating ? "旋转中…" : "旋转 token"}
        </button>
        {rotated && (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-warn">⚠ 新 token（只显示一次）</div>
            <SnippetBox label="New token" code={rotated} />
            <SnippetBox
              label="Updated Claude Desktop config"
              code={JSON.stringify({
                mcpServers: { stagent: { url: `${EDGE_URL_PUB}/mcp`, headers: { Authorization: `Bearer ${rotated}` } } }
              }, null, 2)}
            />
          </div>
        )}
      </section>
    </div>
  )
}
