"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { followUser, unfollowUser } from "@/lib/api"

interface Props {
  userName: string
  initialFollowing: boolean
  isSelf: boolean
  isAuthenticated: boolean
}

export function FollowButton({ userName, initialFollowing, isSelf, isAuthenticated }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (isSelf) {
    return (
      <button
        disabled
        className="px-3 py-1.5 rounded text-sm font-medium bg-bg-elevated text-text-muted cursor-default"
      >
        你
      </button>
    )
  }

  if (!isAuthenticated) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/u/${userName}`)}`}
        className="px-3 py-1.5 rounded text-sm font-medium bg-accent hover:bg-accent-hover text-text-onAccent"
      >
        登录后关注
      </Link>
    )
  }

  function onClick() {
    setError(null)
    const optimistic = !following
    setFollowing(optimistic)
    startTransition(async () => {
      try {
        if (optimistic) await followUser(userName)
        else await unfollowUser(userName)
      } catch (e) {
        setFollowing(!optimistic)
        setError(e instanceof Error ? e.message : "操作失败")
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={pending}
        className={
          following
            ? "px-3 py-1.5 rounded text-sm font-medium border border-border hover:bg-bg-elevated disabled:opacity-50"
            : "px-3 py-1.5 rounded text-sm font-medium bg-accent hover:bg-accent-hover text-text-onAccent disabled:opacity-50"
        }
      >
        {following ? "已关注" : "关注"}
      </button>
      {error && <span className="text-xs text-live">{error}</span>}
    </div>
  )
}
