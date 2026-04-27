import clsx from "clsx"

interface Props {
  className?: string
  pulse?: boolean
}

export function LiveBadge({ className, pulse = true }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-1.5 py-0.5 rounded-sm bg-live text-text-onAccent text-[10px] font-bold tracking-wide uppercase",
        pulse && "animate-live-pulse",
        className,
      )}
    >
      LIVE
    </span>
  )
}
