import Link from "next/link"
import { Search } from "lucide-react"
import { Avatar } from "./Avatar"
import type { UserPrivate } from "@/lib/api"

interface Props {
  user: UserPrivate | null
}

export function Nav({ user }: Props) {
  return (
    <header className="h-[50px] flex items-center px-4 bg-bg-surface border-b border-border">
      <Link href="/" className="flex items-center gap-2 mr-6">
        <span className="text-accent text-xl">●</span>
        <span className="font-bold text-base tracking-tight">Stagent</span>
      </Link>

      <nav className="flex items-center gap-4 text-sm font-medium">
        <Link href="/directory" className="hover:text-accent transition">浏览</Link>
        <Link href="/" className="text-text-muted hover:text-accent transition">关注</Link>
      </nav>

      <div className="flex-1 max-w-md mx-6 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          placeholder="搜索"
          className="w-full bg-bg-elevated border border-border rounded pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <Link href={`/u/${encodeURIComponent(user.display_name)}`} className="flex items-center gap-2">
            <Avatar name={user.display_name} src={user.avatar_url} size={28} />
            <span className="text-sm">{user.display_name}</span>
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-sm text-text-primary hover:text-accent">登录</Link>
            <Link
              href="/register"
              className="px-3 py-1.5 rounded text-sm font-medium bg-accent hover:bg-accent-hover text-text-onAccent"
            >
              注册
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
