import confetti from "canvas-confetti"

const COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#0A84FF",
  "#AF52DE",
  "#FF2D55",
]

/** Full-viewport celebration — fires immediately over the dialog. */
export function firePeelConfetti() {
  const defaults = {
    colors: COLORS,
    disableForReducedMotion: true,
    zIndex: 80,
  } as const

  void confetti({
    ...defaults,
    particleCount: 70,
    spread: 72,
    startVelocity: 38,
    ticks: 160,
    origin: { x: 0.5, y: 0.4 },
  })

  window.setTimeout(() => {
    void confetti({
      ...defaults,
      particleCount: 40,
      angle: 60,
      spread: 52,
      startVelocity: 34,
      ticks: 140,
      origin: { x: 0.15, y: 0.55 },
    })
    void confetti({
      ...defaults,
      particleCount: 40,
      angle: 120,
      spread: 52,
      startVelocity: 34,
      ticks: 140,
      origin: { x: 0.85, y: 0.55 },
    })
  }, 60)
}
