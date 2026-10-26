import { Link } from "@tanstack/react-router"

const links = [
  { to: "/make", label: "Make" },
  { to: "/", label: "Wall" },
  { to: "/stickers", label: "Stickers" },
  { to: "/rules", label: "Rules" },
  { to: "/terms", label: "Terms" },
] as const

export function SiteFooter() {
  return (
    <footer className="border-t border-black/[0.06] font-ui text-[13px] tracking-[-0.01em] text-neutral-500">
      <div className="mx-auto max-w-lg px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <p>
          <span className="font-hand text-[18px] font-bold text-neutral-900">
            CoolThingsOnTheInternet
          </span>{" "}
          built by{" "}
          <a
            href="https://x.com/ekmigasari"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-neutral-900 hover:underline"
          >
            @ekmigasari
          </a>
        </p>
        <nav
          aria-label="Footer"
          className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2"
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="transition-colors hover:text-neutral-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
