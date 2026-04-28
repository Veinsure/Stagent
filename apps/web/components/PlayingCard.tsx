"use client"

const SUIT_GLYPH: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" }

type Size = "sm" | "md" | "lg"

const DIMS: Record<Size, { w: number; h: number; rank: string; corner: string }> = {
  sm: { w: 36, h: 50, rank: "text-base", corner: "text-[8px]" },
  md: { w: 52, h: 72, rank: "text-2xl", corner: "text-[10px]" },
  lg: { w: 64, h: 90, rank: "text-3xl", corner: "text-xs" },
}

interface FaceUpProps {
  faceDown?: false
  rank: string
  suit: string
  size?: Size
  className?: string
}

interface FaceDownProps {
  faceDown: true
  hue?: number
  size?: Size
  className?: string
}

type Props = FaceUpProps | FaceDownProps

export function PlayingCard(props: Props) {
  const size = props.size ?? "sm"
  const { w, h, rank: rankCls, corner: cornerCls } = DIMS[size]
  const baseCls =
    "inline-block rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.4)] select-none"

  if (props.faceDown) {
    const hue = props.hue ?? 215
    return (
      <div
        className={`${baseCls} ${props.className ?? ""}`}
        style={{
          width: w,
          height: h,
          background:
            `repeating-linear-gradient(45deg, hsl(${hue} 60% 32%) 0 4px, hsl(${hue} 60% 22%) 4px 8px)`,
          border: `2px solid hsl(${hue} 70% 55%)`,
        }}
      >
        <div
          className="w-full h-full rounded-[3px]"
          style={{
            background: `radial-gradient(circle at 50% 50%, hsl(${hue} 70% 50% / 0.35) 0%, transparent 60%)`,
          }}
        />
      </div>
    )
  }

  const red = props.suit === "h" || props.suit === "d"
  const colorCls = red ? "text-red-600" : "text-black"
  const glyph = SUIT_GLYPH[props.suit] ?? "?"
  return (
    <div
      className={`${baseCls} relative bg-white ${colorCls} ${props.className ?? ""}`}
      style={{ width: w, height: h }}
    >
      <div className={`absolute top-0.5 left-1 leading-none font-semibold ${cornerCls}`}>
        <div>{props.rank}</div>
        <div>{glyph}</div>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center font-bold ${rankCls}`}>
        {glyph}
      </div>
      <div className={`absolute bottom-0.5 right-1 leading-none font-semibold rotate-180 ${cornerCls}`}>
        <div>{props.rank}</div>
        <div>{glyph}</div>
      </div>
    </div>
  )
}
