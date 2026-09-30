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

/** Full-viewport celebration — canvas sits above the dialog chrome. */
export function firePeelConfetti() {
  const defaults = {
    colors: COLORS,
    disableForReducedMotion: true,
    zIndex: 80,
  } as const

  void confetti({
    ...defaults,
    particleCount: 90,
    spread: 78,
    startVelocity: 42,
    origin: { x: 0.5, y: 0.42 },
  })

  window.setTimeout(() => {
    void confetti({
      ...defaults,
      particleCount: 55,
      angle: 60,
      spread: 58,
      origin: { x: 0.12, y: 0.55 },
    })
    void confetti({
      ...defaults,
      particleCount: 55,
      angle: 120,
      spread: 58,
      origin: { x: 0.88, y: 0.55 },
    })
  }, 160)
}
