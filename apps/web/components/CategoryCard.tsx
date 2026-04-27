import Link from "next/link"

export interface CategoryCardData {
  slug: string
  name: string
  comingSoon?: boolean
  liveCount?: number
  comingLabel?: string
}

export function CategoryCard({ data }: { data: CategoryCardData }) {
  const href = `/directory/${data.slug}`
  return (
    <Link href={href} className="block group">
      <div className="relative aspect-[3/4] rounded overflow-hidden bg-bg-elevated border border-border">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-text-muted/40">{initials(data.name)}</span>
        </div>
        {data.comingSoon && (
          <div className="absolute top-2 right-2 bg-bg-base/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide rounded">
            {data.comingLabel ?? "Coming Soon"}
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="text-sm font-semibold truncate">{data.name}</div>
        {data.comingSoon ? (
          <div className="text-xs text-text-muted">敬请期待</div>
        ) : (
          <div className="text-xs text-text-muted">{data.liveCount ?? 0} 个直播间</div>
        )}
      </div>
    </Link>
  )
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(p => p[0] ?? "").join("").toUpperCase()
}
