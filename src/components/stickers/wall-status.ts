import { plotVisibility, type PlotVisibility } from "@/domain/types"

/** Never round a sliver of coverage up to 100% or down to 0%. */
export function formatPercent(share: number): string {
  if (share >= 0.999) return "100"
  if (share <= 0.001) return "0"
  const pct = share * 100
  if (pct < 1) return "<1"
  if (pct > 99) return ">99"
  return String(Math.round(pct))
}

export const VISIBILITY: Record<
  PlotVisibility,
  { label: string; dot: string; bar: string }
> = {
  visible: { label: "Fully visible", dot: "bg-[#34c759]", bar: "bg-[#34c759]" },
  partly: { label: "Partly covered", dot: "bg-[#ff9f0a]", bar: "bg-[#ff9f0a]" },
  mostly: { label: "Mostly covered", dot: "bg-[#ff453a]", bar: "bg-[#ff453a]" },
  hidden: {
    label: "100% covered",
    dot: "bg-neutral-400",
    bar: "bg-neutral-400",
  },
}

export type WallStatus = PlotVisibility | "none"

/** How a sticker is doing on the wall, from the share of its units showing. */
export function wallStatus(visibleShare: number | null): {
  status: WallStatus
  /** Short enough for a one-line caption, e.g. "38% visible". */
  label: string
  dot: string
} {
  if (visibleShare == null) {
    return { status: "none", label: "Not on the wall", dot: "bg-neutral-300" }
  }
  const status = plotVisibility(visibleShare)
  const { dot } = VISIBILITY[status]
  if (status === "visible") return { status, label: "Fully visible", dot }
  if (status === "hidden") return { status, label: "100% covered", dot }
  return { status, label: `${formatPercent(visibleShare)}% visible`, dot }
}

/** Below this share showing, restoring gets pushed instead of just offered. */
export const NEEDS_RESTORE_BELOW = 0.2

export function needsRestore(visibleShare: number | null): boolean {
  return visibleShare != null && visibleShare < NEEDS_RESTORE_BELOW
}
