import { cn } from "@/lib/utils"
import type { SiteStats } from "@/lib/site-stats"

/**
 * Visitor counts in the bottom-left corner, mirroring the scale bar on the
 * right. Phones lift it above the Explore / Create bar.
 */
export function VisitorStats({
  stats,
  className,
}: {
  stats: SiteStats
  className?: string
}) {
  const today = stats.today.toLocaleString("en-US")
  const total = stats.total.toLocaleString("en-US")
  const noun = stats.total === 1 ? "visitor" : "visitors"

  return (
    <div
      data-ui-chrome
      className={cn(
        "pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] left-3 z-20 font-ui sm:bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:left-4",
        className
      )}
    >
      <p
        aria-label={`${today} today, ${total} ${noun} all time`}
        className="flex items-baseline gap-1.5 rounded-md bg-white/85 px-1.5 py-0.5 text-[11px] leading-tight tabular-nums shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)] backdrop-blur-sm"
      >
        <span className="font-semibold text-neutral-800">{today}</span>
        <span className="text-neutral-500">today</span>
        <span aria-hidden className="text-neutral-300">
          |
        </span>
        <span className="font-semibold text-neutral-800">{total}</span>
        <span className="text-neutral-500">{noun}</span>
      </p>
    </div>
  )
}
