import Link from "next/link"
import { notFound } from "next/navigation"
import { Avatar } from "@/components/Avatar"
import { LiveBadge } from "@/components/LiveBadge"
import { FollowButton } from "@/components/FollowButton"
import { getCurrentUser } from "@/lib/auth"
import { cookies } from "next/headers"

const EDGE_URL = process.env.NEXT_PUBLIC_EDGE_URL ?? "http://localhost:8787"

interface Props {
  params: { name: string }
  searchParams: { manage?: string }
}

export default async function UserPage({ params, searchParams }: Props) {
  const name = decodeURIComponent(params.name)
  const cookieStore = cookies()
  const sid = cookieStore.get("stg_sid")?.value
  const res = await fetch(`${EDGE_URL}/api/users/${encodeURIComponent(name)}`, {
    cache: "no-store",
    headers: sid ? { Cookie: `stg_sid=${sid}` } : {},
  })
  if (res.status === 404) notFound()
  if (!res.ok) throw new Error(`failed: ${res.status}`)
  const data = await res.json() as {
    user: { display_name: string; avatar_url: string | null; bio: string | null; created_at: number }
    live: Array<{ agent_id: string; agent_name: string; room: string }>
    is_following: boolean
    followers_count: number
  }

  const me = await getCurrentUser()
  const isSelf = me?.display_name === name
  const showManage = isSelf && searchParams.manage === "1"

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-start gap-4">
        <Avatar name={data.user.display_name} src={data.user.avatar_url} size={80} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{data.user.display_name}</h1>
            {data.live.length > 0 && <LiveBadge />}
          </div>
          {data.user.bio && <p className="text-sm text-text-muted mt-1">{data.user.bio}</p>}
          <p className="text-xs text-text-muted mt-1">
            注册于 {new Date(data.user.created_at).toLocaleDateString()}
            {" · "}
            {data.followers_count} 粉丝
          </p>
        </div>
        <FollowButton
          userName={data.user.display_name}
          initialFollowing={data.is_following}
          isSelf={isSelf}
          isAuthenticated={me !== null}
        />
      </header>

      {data.live.length > 0 && (
        <section className="bg-bg-surface border border-border rounded p-4">
          <h2 className="text-sm font-semibold mb-3">正在直播</h2>
          <ul className="space-y-2">
            {data.live.map(l => (
              <li key={l.agent_id}>
                <Link
                  href={`/c/${l.room}`}
                  className="flex items-center gap-3 p-2 rounded hover:bg-bg-elevated"
                >
                  <LiveBadge />
                  <div className="text-sm">
                    <span className="font-semibold">{l.agent_name}</span>
                    <span className="text-text-muted"> 在 </span>
                    <span className="text-accent">/c/{l.room}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showManage && (
        <section className="bg-bg-surface border border-border rounded p-4">
          <h2 className="text-sm font-semibold mb-3">管理</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/me/agents" className="px-3 py-1.5 rounded border border-border text-sm hover:border-accent">
              我的 Agent
            </Link>
            <Link href="/me/replays" className="px-3 py-1.5 rounded border border-border text-sm hover:border-accent opacity-50 cursor-not-allowed" title="V3.x 后期">
              我的回放
            </Link>
            <Link href="/me/bookmarks" className="px-3 py-1.5 rounded border border-border text-sm hover:border-accent opacity-50 cursor-not-allowed" title="V3.x 后期">
              收藏
            </Link>
            <Link href="/me/settings" className="px-3 py-1.5 rounded border border-border text-sm hover:border-accent opacity-50 cursor-not-allowed" title="V3.x 后期">
              设置
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
