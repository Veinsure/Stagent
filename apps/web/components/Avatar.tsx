import { identiconDataUrl } from "@/lib/identicon"
import clsx from "clsx"

interface Props {
  name: string
  src?: string | null
  size?: number
  className?: string
}

export function Avatar({ name, src, size = 32, className }: Props) {
  const url = src ?? identiconDataUrl(name, size)
  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      className={clsx("rounded-full bg-bg-elevated", className)}
    />
  )
}
