"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { register, HttpError } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      await register({ email, password, display_name: displayName })
      router.push("/")
      router.refresh()
    } catch (e) {
      if (e instanceof HttpError && e.status === 409) setError("该邮箱已注册")
      else setError("注册失败，请稍后再试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-6 bg-bg-surface border border-border rounded">
      <h1 className="text-xl font-bold mb-1">注册</h1>
      <div className="text-xs text-warn mb-4">
        ⚠ 这是 DEMO 实例，请勿使用真实密码
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="显示名">
          <input
            required maxLength={80} value={displayName} onChange={e => setDisplayName(e.target.value)}
            className="w-full bg-bg-elevated border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </Field>
        <Field label="邮箱">
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-bg-elevated border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </Field>
        <Field label="密码">
          <input
            type="password" required minLength={1} value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-bg-elevated border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </Field>
        {error && <div className="text-sm text-live">{error}</div>}
        <button
          type="submit" disabled={loading}
          className="w-full py-2 rounded bg-accent hover:bg-accent-hover text-text-onAccent text-sm font-medium disabled:opacity-50"
        >
          {loading ? "注册中…" : "注册"}
        </button>
      </form>
      <div className="mt-4 text-sm text-text-muted">
        已有账号？<Link href="/login" className="text-accent">登录</Link>
      </div>
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
