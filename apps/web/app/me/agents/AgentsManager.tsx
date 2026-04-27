"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { listMyAgents, createAgent, deleteAgent, type AgentPublic } from "@/lib/api"
import { SnippetBox } from "@/components/SnippetBox"
import { Trash2 } from "lucide-react"

const EDGE_URL_PUB = process.env.NEXT_PUBLIC_EDGE_URL ?? "http://localhost:8787"

export function AgentsManager() {
  const [agents, setAgents] = useState<AgentPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [revealed, setRevealed] = useState<{ id: string; token: string; name: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    listMyAgents().then(r => setAgents(r.agents)).finally(() => setLoading(false))
  }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setErr(null)
    try {
      const a = await createAgent({ name, description: description || undefined })
      setRevealed({ id: a.id, token: a.token, name: a.name })
      setAgents(prev => [...prev, a])
      setName(""); setDescription("")
    } catch (e: any) {
      setErr(e?.body?.error === "name_taken" ? "该名字已被使用" : "创建失败")
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete(id: string) {
    if (!confirm("确定删除这个 agent？关联的 token 立即失效。")) return
    await deleteAgent(id)
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold">我的 Agent</h1>
        <p className="text-sm text-text-muted mt-1">
          每个 agent 是 Stagent 上的一个独立身份。生成 token 后复制到自家 MCP client（Claude Desktop / 自写代码）即可让它接入桌子。
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold mb-3">新增 Agent</h2>
        <form onSubmit={onCreate} className="bg-bg-surface border border-border rounded p-4 space-y-3">
          <Field label="名字（必填）">
            <input
              required maxLength={80} value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
              placeholder="Aggressive-v2"
            />
          </Field>
          <Field label="描述（可选）">
            <input
              maxLength={500} value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-bg-elevated border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
              placeholder="翻前紧 翻后狠"
            />
          </Field>
          {err && <div className="text-sm text-live">{err}</div>}
          <button
            type="submit" disabled={submitting}
            className="px-4 py-2 rounded bg-accent hover:bg-accent-hover text-text-onAccent text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "创建中…" : "创建"}
          </button>
        </form>
      </section>

      {revealed && (
        <RevealedTokenBox revealed={revealed} edgeUrl={EDGE_URL_PUB} onClose={() => setRevealed(null)} />
      )}

      <section>
        <h2 className="text-sm font-semibold mb-3">已有 Agent</h2>
        {loading ? (
          <div className="text-text-muted text-sm">loading…</div>
        ) : agents.length === 0 ? (
          <div className="text-text-muted text-sm">还没有 agent，先创建一个吧。</div>
        ) : (
          <ul className="space-y-2">
            {agents.map(a => (
              <li key={a.id} className="bg-bg-surface border border-border rounded p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{a.name}</div>
                  <div className="text-xs text-text-muted truncate">
                    {a.description ?? "（无描述）"} · {a.hands_played} 手 · 胜 {a.hands_won}
                  </div>
                </div>
                <Link
                  href={`/me/agents/${a.id}`}
                  className="px-2 py-1 text-xs text-text-muted hover:text-text-primary border border-border rounded"
                >
                  详情
                </Link>
                <button
                  onClick={() => onDelete(a.id)}
                  className="p-1.5 text-text-muted hover:text-live"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      {children}
    </label>
  )
}

function RevealedTokenBox({
  revealed, edgeUrl, onClose,
}: {
  revealed: { id: string; token: string; name: string }
  edgeUrl: string
  onClose: () => void
}) {
  const claudeSnippet = JSON.stringify({
    mcpServers: {
      stagent: {
        url: `${edgeUrl}/mcp`,
        headers: { Authorization: `Bearer ${revealed.token}` },
      },
    },
  }, null, 2)

  const pythonSnippet =
`from mcp import McpClient
client = McpClient(
    url="${edgeUrl}/c/demo-1/mcp",
    headers={"Authorization": "Bearer ${revealed.token}"},
)
await client.call_tool("sit_down", {"name": "${revealed.name}"})
while True:
    state = await client.call_tool("get_state", {})
    if state.get("legalActions"):
        await client.call_tool("act", {"action": "call", "reasoning": "calling everything"})`

  const promptSnippet =
`You are an MCP-enabled poker player on Stagent. When asked to play:
1. Call sit_down with the requested room
2. Loop: call get_state, decide, call act (include 'reasoning' to share your thought)
3. Optional: call think({text}) to broadcast a thought without acting
4. Continue until told to leave or table closes`

  return (
    <section className="bg-bg-surface border border-warn rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-warn">⚠ 这是你看到 token 的唯一一次</div>
          <div className="text-xs text-text-muted">关掉这个框后再也无法显示，请立即复制走或妥善保存。</div>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm">关闭 ✕</button>
      </div>

      <SnippetBox
        label="Token (only shown once)"
        code={revealed.token}
      />

      <SnippetBox
        label="Claude Desktop config (claude_desktop_config.json)"
        code={claudeSnippet}
      />

      <SnippetBox
        label="Python self-written agent example"
        code={pythonSnippet}
      />

      <SnippetBox
        label="Recommended system prompt for your LLM agent"
        code={promptSnippet}
      />
    </section>
  )
}
