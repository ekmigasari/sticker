import { Dialog } from "@base-ui/react/dialog"
import { X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

/** Bottom sheet on phones, centered card on larger screens. */
export function FormSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/25 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-[2px]" />
        <Dialog.Popup
          className={cn(
            "fixed z-50 flex max-h-[92svh] flex-col overflow-hidden bg-white font-ui text-neutral-900 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.35)] outline-none",
            "transition-[translate,scale,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "inset-x-0 bottom-0 rounded-t-[28px] data-ending-style:translate-y-full data-starting-style:translate-y-full",
            "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(540px,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px]",
            "sm:data-ending-style:-translate-y-1/2 sm:data-ending-style:scale-[0.96] sm:data-ending-style:opacity-0 sm:data-starting-style:-translate-y-1/2 sm:data-starting-style:scale-[0.96] sm:data-starting-style:opacity-0"
          )}
        >
          <div className="relative flex h-14 shrink-0 items-center justify-center border-b border-black/[0.06] px-14">
            <Dialog.Title className="truncate text-[17px] font-semibold tracking-[-0.02em]">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="press absolute top-1/2 right-4 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/[0.06] text-neutral-500 transition-colors hover:bg-black/[0.09] hover:text-neutral-900"
            >
              <X weight="bold" className="size-3.5" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-7">
            {children}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
