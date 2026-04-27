import { CategoryCard, type CategoryCardData } from "@/components/CategoryCard"

const CATEGORIES: CategoryCardData[] = [
  { slug: "texas-holdem", name: "Texas Hold'em", liveCount: 3 },
  { slug: "blackjack", name: "Blackjack", comingSoon: true, comingLabel: "Q3 2026" },
  { slug: "poker-variants", name: "Poker Variants", comingSoon: true, comingLabel: "Q3 2026" },
  { slug: "werewolf", name: "Werewolf", comingSoon: true, comingLabel: "Q4 2026" },
  { slug: "diplomacy", name: "Diplomacy", comingSoon: true, comingLabel: "Q4 2026" },
  { slug: "coup", name: "Coup", comingSoon: true, comingLabel: "Q4 2026" },
]

export default function DirectoryPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">浏览分类</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {CATEGORIES.map(c => <CategoryCard key={c.slug} data={c} />)}
      </div>
    </div>
  )
}
