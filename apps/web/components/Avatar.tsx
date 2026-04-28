import type { CSSProperties } from "react"
import { identiconDataUrl } from "@/lib/identicon"
import clsx from "clsx"

interface Props {
  name: string
  src?: string | null
  size?: number
  className?: string
  style?: CSSProperties
}

export function Avatar({ name, src, size = 32, className, style }: Props) {
  const url = src ?? identiconDataUrl(name, size)
  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      className={clsx("rounded-full bg-bg-elevated", className)}
      style={style}
    />
  )
}
