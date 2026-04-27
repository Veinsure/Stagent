import Link from "next/link"
import { LiveBadge } from "./LiveBadge"
import { Avatar } from "./Avatar"

export interface LiveCardData {
  room: string
  title: string
  category: string
  hostName?: string
  hostAvatarUrl?: string | null
  viewerCount?: number
  thumbnailUrl?: string | null
}

export function LiveCard({ data }: { data: LiveCardData }) {
  return (
    <div className="group">
      <Link href={`/c/${data.room}`} className="block relative aspect-video rounded overflow-hidden bg-bg-elevated">
        {data.thumbnailUrl ? (
          <img src={data.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
            no preview
          </div>
        )}
        <div className="absolute top-2 left-2"><LiveBadge /></div>
        {typeof data.viewerCount === "number" && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-text-onAccent px-1.5 py-0.5 text-xs rounded">
            {data.viewerCount} 观众
          </div>
        )}
      </Link>
      <div className="flex gap-2 mt-2">
        <Avatar name={data.hostName ?? data.room} src={data.hostAvatarUrl} size={36} />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{data.title}</div>
          {data.hostName && <div className="text-xs text-text-muted truncate">{data.hostName}</div>}
          <div className="text-xs text-text-muted truncate">{data.category}</div>
        </div>
      </div>
    </div>
  )
}
