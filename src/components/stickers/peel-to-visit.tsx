import { useState } from "react"
import { FloatingSticker } from "@/components/make/floating-sticker"

type Props = {
  src: string
  name: string
  url: string
  holo: boolean
  displayPx: number
  onTap?: () => void
  floating?: boolean
  /** Animate in on first mount; re-sticking after a visit always animates. */
  appearOnMount?: boolean
  hitPad?: number
  touchAction?: "none" | "pan-y"
}

/** Peeling the sticker all the way off opens the maker's site, then it re-sticks. */
export function PeelToVisit({
  src,
  name,
  url,
  holo,
  displayPx,
  appearOnMount = true,
  ...rest
}: Props) {
  const [session, setSession] = useState(0)

  function visit() {
    // `noopener` in the features string makes window.open return null even on
    // success, so drop the opener by hand to still detect a blocked popup.
    const tab = window.open(url, "_blank")
    if (tab) tab.opener = null
    else window.location.assign(url)
    window.setTimeout(() => setSession((n) => n + 1), 400)
  }

  return (
    <FloatingSticker
      key={session}
      src={src}
      alt={name}
      holo={holo}
      displayPx={displayPx}
      appearKey={session}
      appear={appearOnMount || session > 0}
      onFullyPeeled={visit}
      {...rest}
    />
  )
}
