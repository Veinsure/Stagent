"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar } from "./Avatar"
import { logout, type UserPrivate } from "@/lib/api"

interface Props { user: UserPrivate }

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  async function onLogout() {
    setOpen(false)
    try { await logout() } catch {}
    router.push("/")
    router.refresh()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 hover:opacity-80"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.display_name} src={user.avatar_url} size={28} />
        <span className="text-sm">{user.display_name}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-48 bg-bg-surface border border-border rounded shadow-lg py-1 z-50"
        >
          <MenuLink href={`/u/${encodeURIComponent(user.display_name)}`} onClick={() => setOpen(false)}>
            我的主播页
          </MenuLink>
          <MenuLink href="/me/agents" onClick={() => setOpen(false)}>
            我的 Agent
          </MenuLink>
          <div className="my-1 border-t border-border" />
          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-bg-elevated"
            role="menuitem"
          >
            登出
          </button>
        </div>
      )}
    </div>
  )
}

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-1.5 text-sm hover:bg-bg-elevated"
      role="menuitem"
    >
      {children}
    </Link>
  )
}
