import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowRight } from "@phosphor-icons/react"
import { buttonVariants } from "@/components/ui/button"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <div className="flex flex-1 flex-col">
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
            <Link
              to="/files"
              className={buttonVariants({ className: "w-full sm:w-auto" })}
            >
              Start building
              <ArrowRight weight="bold" />
            </Link>
            <div className="text-center font-mono text-xs text-muted-foreground sm:text-left">
              Sign in to upload files
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
