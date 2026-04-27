"use client"

import { useState } from "react"

interface Props {
  open: boolean
  isLoggedIn: boolean
  handsCount: number
  onSave: (visibility: "public" | "private") => void
  onSkip: () => void
}

export function LeaveModal({ open, isLoggedIn, handsCount, onSave, onSkip }: Props) {
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/70">
      <div className="bg-bg-surface border border-border rounded p-6 max-w-sm w-full mx-4">
        <h2 className="text-lg font-bold mb-2">保存本次回放？</h2>
        <p className="text-sm text-text-muted mb-4">
          本次观看共 {handsCount} 手牌的事件已缓存在浏览器中。
        </p>
        {isLoggedIn ? (
          <>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input
                type="radio" name="vis" checked={visibility === "private"}
                onChange={() => setVisibility("private")}
              />
              仅自己可见
            </label>
            <label className="flex items-center gap-2 text-sm mb-4">
              <input
                type="radio" name="vis" checked={visibility === "public"}
                onChange={() => setVisibility("public")}
              />
              公开（任何人可看）
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={onSkip} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary">
                跳过
              </button>
              <button
                onClick={() => onSave(visibility)}
                className="px-4 py-1.5 rounded bg-accent hover:bg-accent-hover text-text-onAccent text-sm font-medium"
              >
                保存
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-warn mb-4">
              想保存回放？请先登录。本次缓存随页面刷新就会清空。
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={onSkip} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary">
                跳过
              </button>
              <a
                href="/login"
                className="px-4 py-1.5 rounded bg-accent hover:bg-accent-hover text-text-onAccent text-sm font-medium"
              >
                去登录
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
