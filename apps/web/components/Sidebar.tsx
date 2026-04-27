import Link from "next/link"
import { Avatar } from "./Avatar"

interface ChannelItem {
  name: string
  href: string
  live?: boolean
  category?: string
}

interface Props {
  followed?: ChannelItem[]
  recommended?: ChannelItem[]
}

const DEFAULT_RECOMMENDED: ChannelItem[] = [
  { name: "demo-1", href: "/c/demo-1", live: true, category: "Texas Hold'em" },
  { name: "demo-2", href: "/c/demo-2", live: true, category: "Texas Hold'em" },
  { name: "demo-3", href: "/c/demo-3", live: true, category: "Texas Hold'em" },
]

export function Sidebar({ followed = [], recommended = DEFAULT_RECOMMENDED }: Props) {
  return (
    <nav className="w-[240px] shrink-0 bg-bg-surface border-r border-border overflow-y-auto">
      {followed.length > 0 && (
        <Section title="关注的频道">
          {followed.map(c => <Channel key={c.href} {...c} />)}
        </Section>
      )}
      <Section title="推荐频道">
        {recommended.map(c => <Channel key={c.href} {...c} />)}
      </Section>
    </nav>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <div className="px-3 py-1 text-text-muted text-xs uppercase tracking-wide">{title}</div>
      <ul>{children}</ul>
    </div>
  )
}

function Channel({ name, href, live, category }: ChannelItem) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-2 px-3 py-1.5 hover:bg-bg-elevated">
        <Avatar name={name} size={28} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          {category && <div className="text-xs text-text-muted truncate">{category}</div>}
        </div>
        {live && <span className="w-2 h-2 rounded-full bg-live animate-live-pulse" />}
      </Link>
    </li>
  )
}
