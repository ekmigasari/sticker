import { Link, Outlet, createFileRoute, notFound } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"

export const Route = createFileRoute("/_protected/admin")({
  // UI gate only; every admin server function checks the role again.
  beforeLoad: ({ context }) => {
    if (!context.user.isAdmin) throw notFound()
  },
  head: () => ({
    meta: [
      { title: "Admin · CoolThingsOnTheInternet" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
})

const TABS = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/users", label: "Users", exact: false },
  { to: "/admin/stickers", label: "Stickers", exact: false },
] as const

function AdminLayout() {
  return (
    <AppChrome>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 font-ui sm:px-8 sm:py-14">
        <header className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-[13px] font-semibold tracking-[-0.01em] text-[#0071e3]">
              Moderation
            </p>
            <h1 className="nk-title">Admin</h1>
          </div>
          <nav
            aria-label="Admin"
            className="flex h-11 w-fit items-center rounded-[14px] bg-[#f5f5f7] p-1"
          >
            {TABS.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                activeOptions={{ exact: tab.exact, includeSearch: false }}
                className="flex h-full items-center rounded-[10px] px-4 text-[14px] font-medium tracking-[-0.01em] text-neutral-500 transition-colors hover:text-neutral-900 [&.active]:bg-white [&.active]:font-semibold [&.active]:text-neutral-900 [&.active]:shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </header>
        <Outlet />
      </div>
    </AppChrome>
  )
}
