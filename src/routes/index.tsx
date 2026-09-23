import { createFileRoute } from "@tanstack/react-router"
import { ArrowRight } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <div className="flex min-h-svh flex-col px-6 py-8 sm:px-10">
      <header className="flex items-center justify-between">
        <span className="font-mono text-xs tracking-[0.25em] uppercase">
          xmigas FE prototype
        </span>
        <span className="font-mono text-xs tracking-[0.15em] text-muted-foreground">
          2026
        </span>
      </header>

      <main className="mb-16 flex flex-1 flex-col justify-center">
        <div className="flex max-w-4xl flex-col gap-8">
          <img
            src="/icon-xmigas.png"
            alt="xmigas"
            width={148}
            height={148}
            className="size-37"
          />
          <p className="font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase">
            TanStack Start · React · shadcn/ui · AI Skills
          </p>

          <h1 className="font-heading text-4xl font-medium tracking-tight text-foreground sm:text-6xl">
            A quiet place to begin building.
          </h1>

          <p className="max-w-2xl text-sm leading-loose text-muted-foreground">
            This is the starting point for your prototype. The layout is plain
            by design, so what you add next is the only thing worth noticing.
          </p>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button className="w-full sm:w-auto">
              Start building
              <ArrowRight weight="bold" />
            </Button>
            <div className="text-center font-mono text-xs text-muted-foreground sm:text-left">
              60+ components installed
            </div>
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-xs text-muted-foreground">
          Boilerplate
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          Lora · Inter · Mono
        </span>
      </footer>
    </div>
  )
}
