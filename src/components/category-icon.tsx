import {
  AirplaneTilt,
  Briefcase,
  Buildings,
  ChartBar,
  Code,
  Cpu,
  CurrencyBtc,
  DotsThreeCircle,
  GameController,
  GraduationCap,
  Handshake,
  Heartbeat,
  Lightning,
  Megaphone,
  Newspaper,
  PaintBrush,
  PencilLine,
  PuzzlePiece,
  Robot,
  ShieldCheck,
  ShoppingBag,
  Stack,
  UserCircle,
  UsersThree,
  Wallet,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react"
import type { Category } from "@/domain/types"
import { cn } from "@/lib/utils"

const ICONS: Record<Category | "All", Icon> = {
  All: Stack,
  "AI & Agents": Robot,
  "Developer Tools": Code,
  "No-Code": PuzzlePiece,
  Productivity: Lightning,
  "Design & Creative": PaintBrush,
  "Marketing & SEO": Megaphone,
  "Sales & CRM": Handshake,
  "Analytics & Data": ChartBar,
  "Finance & Fintech": Wallet,
  "Crypto & Web3": CurrencyBtc,
  Ecommerce: ShoppingBag,
  "Social & Community": UsersThree,
  "Writing & Content": PencilLine,
  "Media & Newsletters": Newspaper,
  Education: GraduationCap,
  "Health & Fitness": Heartbeat,
  "Travel & Lifestyle": AirplaneTilt,
  "Games & Entertainment": GameController,
  "Hiring & Careers": Briefcase,
  "Security & Privacy": ShieldCheck,
  Hardware: Cpu,
  "Agencies & Services": Buildings,
  "Personal Brand": UserCircle,
  Other: DotsThreeCircle,
}

/** Text-safe accent per category (≥4.5:1 on white). */
const ACCENTS: Record<Category | "All", string> = {
  All: "#1d1d1f",
  "AI & Agents": "#7c3aed",
  "Developer Tools": "#2563eb",
  "No-Code": "#0e7490",
  Productivity: "#b45309",
  "Design & Creative": "#db2777",
  "Marketing & SEO": "#c2410c",
  "Sales & CRM": "#047857",
  "Analytics & Data": "#4f46e5",
  "Finance & Fintech": "#15803d",
  "Crypto & Web3": "#a16207",
  Ecommerce: "#e11d48",
  "Social & Community": "#0369a1",
  "Writing & Content": "#9333ea",
  "Media & Newsletters": "#dc2626",
  Education: "#0f766e",
  "Health & Fitness": "#4d7c0f",
  "Travel & Lifestyle": "#c026d3",
  "Games & Entertainment": "#6d28d9",
  "Hiring & Careers": "#475569",
  "Security & Privacy": "#1e40af",
  Hardware: "#57534e",
  "Agencies & Services": "#9a3412",
  "Personal Brand": "#be185d",
  Other: "#525252",
}

export function categoryAccent(category: Category | "All"): string {
  return ACCENTS[category]
}

export function CategoryIcon({
  category,
  weight = "fill",
  color,
  className,
}: {
  category: Category | "All"
  weight?: IconWeight
  color?: string
  className?: string
}) {
  const Glyph = ICONS[category]
  return (
    <Glyph weight={weight} color={color} aria-hidden className={className} />
  )
}

/** Icon + name in the category's accent color. */
export function CategoryTag({
  category,
  className,
  iconClassName = "size-3.5",
}: {
  category: Category
  className?: string
  iconClassName?: string
}) {
  return (
    <span
      className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
      style={{ color: categoryAccent(category) }}
    >
      <CategoryIcon
        category={category}
        className={cn("shrink-0", iconClassName)}
      />
      <span className="truncate">{category}</span>
    </span>
  )
}
