import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { motion, AnimatePresence } from "motion/react"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerWall } from "@/components/wall/sticker-wall"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  const [heroVisible, setHeroVisible] = useState(true)

  return (
    <AppChrome variant="wall">
      <StickerWall
        hideControls={heroVisible}
        clearHeroZone={heroVisible}
      />

      <AnimatePresence>
        {heroVisible ? (
          <motion.div
            data-ui-chrome
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            <motion.div
              className="pointer-events-auto relative flex max-w-lg flex-col items-center text-center"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{
                delay: 0.08,
                duration: 0.45,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <h1 className="font-ui text-[48px] leading-none font-semibold tracking-[-0.035em] text-neutral-900 sm:text-[64px]">
                Netkraft
              </h1>
              <p className="font-ui mt-4 max-w-[22rem] text-[17px] leading-snug text-neutral-500 sm:text-[19px]">
                cool things built by people on internet
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/make"
                  className="press inline-flex h-12 items-center rounded-full bg-neutral-900 px-7 text-[15px] font-semibold tracking-[-0.01em] text-white shadow-[0_8px_24px_-10px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-90"
                >
                  Create sticker
                </Link>
                <button
                  type="button"
                  onClick={() => setHeroVisible(false)}
                  className="press inline-flex h-12 items-center rounded-full bg-black/[0.06] px-6 text-[15px] font-semibold tracking-[-0.01em] text-neutral-900 transition-colors hover:bg-black/[0.09]"
                >
                  Explore wall
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppChrome>
  )
}
