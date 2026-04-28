"use client"

// Cute chip icon with tier color by amount.
// Tiers: white < red < green < blue < black

type Size = "sm" | "md" | "lg"

const DIMS: Record<Size, { px: number; text: string }> = {
  sm: { px: 20, text: "text-xs" },
  md: { px: 28, text: "text-sm" },
  lg: { px: 36, text: "text-base" },
}

function tier(amount: number): { fill: string; rim: string; label: string } {
  if (amount >= 5000) return { fill: "#1a1a1a", rim: "#3a3a3a", label: "text-zinc-100" }
  if (amount >= 1000) return { fill: "#1d4ed8", rim: "#60a5fa", label: "text-blue-100" }
  if (amount >= 500)  return { fill: "#15803d", rim: "#4ade80", label: "text-emerald-100" }
  if (amount >= 100)  return { fill: "#b91c1c", rim: "#f87171", label: "text-red-100" }
  return { fill: "#f4f4f5", rim: "#a1a1aa", label: "text-zinc-700" }
}

interface Props {
  amount: number
  size?: Size
  hideZero?: boolean
  className?: string
  /** label text override; default shows formatted amount */
  label?: string
}

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function ChipStack({ amount, size = "sm", hideZero, className, label }: Props) {
  if (hideZero && amount <= 0) return null
  const { px, text } = DIMS[size]
  const t = tier(amount)
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        aria-hidden
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}
      >
        {/* outer disc */}
        <circle cx="12" cy="12" r="11" fill={t.fill} stroke={t.rim} strokeWidth="1" />
        {/* edge notches (cute) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180
          const x1 = 12 + Math.cos(rad) * 9.5
          const y1 = 12 + Math.sin(rad) * 9.5
          const x2 = 12 + Math.cos(rad) * 11
          const y2 = 12 + Math.sin(rad) * 11
          return (
            <line
              key={deg}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={t.rim}
              strokeWidth="2"
              strokeLinecap="round"
            />
          )
        })}
        {/* inner ring */}
        <circle cx="12" cy="12" r="6.5" fill="none" stroke={t.rim} strokeWidth="0.8" strokeDasharray="1.5 1" />
        {/* center dot */}
        <circle cx="12" cy="12" r="2.2" fill={t.rim} />
      </svg>
      <span className={`font-medium tabular-nums ${text} ${t.label === "text-zinc-700" ? "text-twitch-text" : ""}`}>
        {label ?? fmt(amount)}
      </span>
    </span>
  )
}
