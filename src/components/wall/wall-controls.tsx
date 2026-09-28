import { useState } from "react"
import {
  DiceFive,
  MagnifyingGlass,
  Sparkle,
  Plus,
  Minus,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWallStore } from "@/store/wall-store"

export function WallControls() {
  const [query, setQuery] = useState("")
  const [miss, setMiss] = useState(false)
  const focusNewest = useWallStore((s) => s.focusNewest)
  const focusRandom = useWallStore((s) => s.focusRandom)
  const searchJump = useWallStore((s) => s.searchJump)
  const camera = useWallStore((s) => s.camera)
  const setCamera = useWallStore((s) => s.setCamera)

  return (
    <div className="pointer-events-auto absolute top-3 right-3 left-3 z-20 flex flex-col gap-2 sm:top-4 sm:right-4 sm:left-auto sm:w-[22rem]">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const hit = searchJump(query)
          setMiss(!hit)
        }}
      >
        <div className="relative flex-1">
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setMiss(false)
            }}
            placeholder="Find a maker product…"
            className="rounded-xl border-border/80 bg-card/95 pl-9 shadow-sm backdrop-blur-md"
          />
        </div>
        <Button type="submit" size="sm" className="rounded-xl">
          Go
        </Button>
      </form>
      {miss ? (
        <p className="rounded-lg bg-card/90 px-3 py-1.5 font-mono text-[11px] text-destructive shadow-sm">
          No product matched that search.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="rounded-xl"
          onClick={focusNewest}
        >
          <Sparkle weight="fill" data-icon="inline-start" />
          Newest
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="rounded-xl"
          onClick={focusRandom}
        >
          <DiceFive weight="fill" data-icon="inline-start" />
          Random
        </Button>
        <div className="ml-auto flex overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-sm">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="rounded-none"
            onClick={() =>
              setCamera({ zoom: Math.max(0.55, camera.zoom * 0.85) })
            }
            aria-label="Zoom out"
          >
            <Minus weight="bold" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="rounded-none"
            onClick={() =>
              setCamera({ zoom: Math.min(6, camera.zoom * 1.15) })
            }
            aria-label="Zoom in"
          >
            <Plus weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  )
}
