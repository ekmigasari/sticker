import { createFileRoute, Link } from "@tanstack/react-router"
import { motion } from "motion/react"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerWall } from "@/components/wall/sticker-wall"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <AppChrome variant="wall">
      <StickerWall />
      <motion.div
        data-ui-chrome
        className="pointer-events-none absolute bottom-3 left-3 z-20 hidden max-w-xs sm:block"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
      >
        <div className="pointer-events-auto rounded-2xl border border-border/80 bg-card/90 px-4 py-3 shadow-md backdrop-blur-md">
          <p className="font-heading text-sm font-extrabold leading-snug">
            Make a sticker. Put it anywhere. The wall never stops growing.
          </p>
          <Link
            to="/make"
            className={cn(
              buttonVariants({ size: "xs", variant: "secondary" }),
              "mt-2 rounded-lg"
            )}
          >
            Start free
          </Link>
        </div>
      </motion.div>
    </AppChrome>
  )
}
