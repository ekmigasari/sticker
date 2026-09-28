import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerGenerator } from "@/components/make/sticker-generator"

export const Route = createFileRoute("/make")({ component: MakePage })

function MakePage() {
  return (
    <AppChrome>
      <div className="px-4 py-8 sm:px-8">
        <header className="mx-auto mb-8 max-w-6xl">
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Free · no account
          </p>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
            Make a sticker
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Upload your product, logo, or illustration. Classic cutout + outline.
            Download free — or put it on the wall.
          </p>
        </header>
        <StickerGenerator />
      </div>
    </AppChrome>
  )
}
