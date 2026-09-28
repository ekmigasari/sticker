import { useState } from "react"
import {
  DiceFive,
  MagnifyingGlass,
  Sparkle,
  Plus,
  Minus,
} from "@phosphor-icons/react"
import { useWallStore } from "@/store/wall-store"

export function WallControls() {
  const [query, setQuery] = useState("")
  const [miss, setMiss] = useState(false)
  const focusNewest = useWallStore((s) => s.focusNewest)
  const focusRandom = useWallStore((s) => s.focusRandom)
  const searchJump = useWallStore((s) => s.searchJump)
  const setCamera = useWallStore((s) => s.setCamera)

  return (
    <div className="font-ui pointer-events-auto absolute top-16 right-3 left-3 z-20 flex flex-col gap-2 sm:top-[4.5rem] sm:right-4 sm:left-auto sm:w-[22rem]">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const hit = searchJump(query)
          setMiss(!hit)
        }}
      >
        <div className="relative flex-1">
          <MagnifyingGlass
            weight="bold"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setMiss(false)
            }}
            placeholder="Find a product"
            className="h-11 w-full rounded-full border border-black/[0.06] bg-white/80 pr-4 pl-10 text-[14px] tracking-[-0.01em] text-neutral-900 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.12)] outline-none backdrop-blur-xl backdrop-saturate-150 placeholder:text-neutral-400 focus:border-black/15 focus:bg-white"
          />
        </div>
        <button
          type="submit"
          className="press h-11 shrink-0 rounded-full bg-neutral-900 px-5 text-[14px] font-semibold tracking-[-0.01em] text-white"
        >
          Go
        </button>
      </form>
      {miss ? (
        <p className="rounded-full bg-white/90 px-4 py-2 text-[13px] text-red-500 shadow-sm backdrop-blur-md">
          No product matched that search.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/80 px-3.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-700 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-colors hover:bg-white"
          onClick={focusNewest}
        >
          <Sparkle weight="fill" className="size-3.5" />
          Newest
        </button>
        <button
          type="button"
          className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/80 px-3.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-700 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-colors hover:bg-white"
          onClick={focusRandom}
        >
          <DiceFive weight="fill" className="size-3.5" />
          Random
        </button>
        <div className="ml-auto flex overflow-hidden rounded-full border border-black/[0.06] bg-white/80 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] backdrop-blur-xl">
          <button
            type="button"
            className="press grid size-9 place-items-center text-neutral-700 transition-colors hover:bg-black/[0.04]"
            onClick={() => {
              const zoom = useWallStore.getState().camera.zoom
              setCamera({ zoom: Math.max(0.55, zoom * 0.85) })
            }}
            aria-label="Zoom out"
          >
            <Minus weight="bold" className="size-3.5" />
          </button>
          <button
            type="button"
            className="press grid size-9 place-items-center text-neutral-700 transition-colors hover:bg-black/[0.04]"
            onClick={() => {
              const zoom = useWallStore.getState().camera.zoom
              setCamera({ zoom: Math.min(6, zoom * 1.15) })
            }}
            aria-label="Zoom in"
          >
            <Plus weight="bold" className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
