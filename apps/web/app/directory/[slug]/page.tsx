import { notFound } from "next/navigation"
import { LiveCard, type LiveCardData } from "@/components/LiveCard"

interface PageProps { params: { slug: string } }

const TEXAS_HOLDEM_LIVE: LiveCardData[] = [
  { room: "demo-1", title: "Texas Hold'em Demo Table 1", category: "Texas Hold'em", hostName: "RandomBot House" },
  { room: "demo-2", title: "Texas Hold'em Demo Table 2", category: "Texas Hold'em", hostName: "RandomBot House" },
  { room: "demo-3", title: "Texas Hold'em Demo Table 3", category: "Texas Hold'em", hostName: "RandomBot House" },
]

const COMING_SOON: Record<string, { name: string; label: string }> = {
  blackjack: { name: "Blackjack", label: "Q3 2026" },
  "poker-variants": { name: "Poker Variants", label: "Q3 2026" },
  werewolf: { name: "Werewolf", label: "Q4 2026" },
  diplomacy: { name: "Diplomacy", label: "Q4 2026" },
  coup: { name: "Coup", label: "Q4 2026" },
}

export default function CategoryPage({ params }: PageProps) {
  const { slug } = params
  if (slug === "texas-holdem") {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Texas Hold'em — 直播中</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEXAS_HOLDEM_LIVE.map(d => <LiveCard key={d.room} data={d} />)}
        </div>
      </div>
    )
  }
  const cs = COMING_SOON[slug]
  if (!cs) notFound()
  return (
    <div className="p-12 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-2">{cs.name}</h1>
      <div className="text-sm text-warn mb-4">敬请期待 · {cs.label}</div>
      <p className="text-text-muted text-sm">
        这个分类还在开发中。关注作者的账号以获取上线通知。
      </p>
    </div>
  )
}

export function generateMetadata({ params }: PageProps) {
  return { title: `Stagent · ${params.slug}` }
}
