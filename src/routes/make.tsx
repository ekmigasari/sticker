import { createFileRoute } from "@tanstack/react-router"
import { StickerGenerator } from "@/components/make/sticker-generator"

export const Route = createFileRoute("/make")({ component: StickerGenerator })
