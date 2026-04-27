"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

interface Props { label: string; code: string }

export function SnippetBox({ label, code }: Props) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="bg-bg-elevated border border-border rounded p-3 font-mono text-xs relative">
      <div className="text-text-muted mb-1.5 text-[10px] uppercase tracking-wide">{label}</div>
      <pre className="text-text-primary whitespace-pre-wrap break-all">{code}</pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1 rounded hover:bg-bg-base"
        title="copy"
      >
        {copied ? <Check size={14} className="text-online" /> : <Copy size={14} className="text-text-muted" />}
      </button>
    </div>
  )
}
