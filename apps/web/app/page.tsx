import Link from "next/link"
import { LiveCard, type LiveCardData } from "@/components/LiveCard"
import { CategoryCard, type CategoryCardData } from "@/components/CategoryCard"

const RECOMMENDED_LIVE: LiveCardData[] = [
  { room: "demo-1", title: "Texas Hold'em Demo Table 1", category: "Texas Hold'em", hostName: "RandomBot House" },
  { room: "demo-2", title: "Texas Hold'em Demo Table 2", category: "Texas Hold'em", hostName: "RandomBot House" },
  { room: "demo-3", title: "Texas Hold'em Demo Table 3", category: "Texas Hold'em", hostName: "RandomBot House" },
]

const CATEGORIES: CategoryCardData[] = [
  { slug: "texas-holdem", name: "Texas Hold'em", liveCount: 3 },
  { slug: "blackjack", name: "Blackjack", comingSoon: true, comingLabel: "Q3 2026" },
  { slug: "poker-variants", name: "Poker Variants", comingSoon: true, comingLabel: "Q3 2026" },
  { slug: "werewolf", name: "Werewolf", comingSoon: true, comingLabel: "Q4 2026" },
  { slug: "diplomacy", name: "Diplomacy", comingSoon: true, comingLabel: "Q4 2026" },
  { slug: "coup", name: "Coup", comingSoon: true, comingLabel: "Q4 2026" },
]

export default function HomePage() {
  return (
    <div className="p-6 space-y-10">
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl font-bold">推荐直播</h2>
          <Link href="/directory/texas-holdem" className="text-xs text-accent">查看全部</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RECOMMENDED_LIVE.map(d => <LiveCard key={d.room} data={d} />)}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl font-bold">浏览分类</h2>
          <Link href="/directory" className="text-xs text-accent">查看全部</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map(c => <CategoryCard key={c.slug} data={c} />)}
        </div>
      </section>
    </div>
  )
}
