import { cn } from "@/lib/utils"

export function initials(name: string | undefined, email: string | undefined) {
  const source = (name?.trim() || email?.split("@")[0] || "?").trim()
  const parts = source.split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : source.slice(0, 2)
  return letters.toUpperCase()
}

/** Photo when set, initials otherwise. Size and ring come from `className`. */
export function ProfileAvatar({
  name,
  email,
  image,
  className,
}: {
  name?: string
  email?: string
  image?: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-b from-neutral-400 to-neutral-600 font-semibold tracking-[-0.02em] text-white",
        className
      )}
    >
      {image ? (
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        initials(name, email)
      )}
    </span>
  )
}
