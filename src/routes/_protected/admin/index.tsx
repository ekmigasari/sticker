import { Link, createFileRoute } from "@tanstack/react-router"
import { ModeratedStickerList, UserList } from "@/components/admin/admin-rows"
import { ReportList } from "@/components/admin/report-list"
import { Section, formatDollars } from "@/components/admin/admin-ui"
import { getAdminOverview } from "@/lib/admin"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_protected/admin/")({
  loader: () => getAdminOverview(),
  component: AdminOverviewPage,
})

const statBox = "rounded-[20px] bg-[#f5f5f7] p-4"
const statLink = cn(
  statBox,
  "press transition-colors outline-none hover:bg-[#ededf0] focus-visible:ring-2 focus-visible:ring-[#0071e3]"
)

function AdminOverviewPage() {
  const o = Route.useLoaderData()

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Link to="/admin/users" className={statLink}>
          <Stat
            label="Users"
            value={o.users}
            hint={`+${o.newUsers7d} this week`}
          />
        </Link>
        <Link
          to="/admin/users"
          search={{ filter: "banned" }}
          className={statLink}
        >
          <Stat label="Banned" value={o.banned} alert={o.banned > 0} />
        </Link>
        <Link
          to="/admin/users"
          search={{ filter: "admins" }}
          className={statLink}
        >
          <Stat label="Admins" value={o.admins} />
        </Link>
        <div className={statBox}>
          <Stat label="Wall revenue" value={formatDollars(o.revenue)} />
        </div>
        <Link to="/admin/stickers" className={statLink}>
          <Stat
            label="Stickers"
            value={o.stickers}
            hint={`+${o.newStickers7d} this week`}
          />
        </Link>
        <Link
          to="/admin/stickers"
          search={{ filter: "listed" }}
          className={statLink}
        >
          <Stat label="Listed" value={o.listed} />
        </Link>
        <Link
          to="/admin/stickers"
          search={{ filter: "hidden" }}
          className={statLink}
        >
          <Stat label="Taken down" value={o.hidden} alert={o.hidden > 0} />
        </Link>
        <Link
          to="/admin/stickers"
          search={{ filter: "archived" }}
          className={statLink}
        >
          <Stat label="Archived" value={o.archived} />
        </Link>
        <Link to="/admin/reports" className={statLink}>
          <Stat
            label="Open reports"
            value={o.openReports}
            alert={o.openReports > 0}
          />
        </Link>
      </div>

      <Section title="Newest users" action={<SeeAll to="/admin/users" />}>
        {o.recentUsers.length ? (
          <UserList users={o.recentUsers} />
        ) : (
          <p className="text-[15px] text-neutral-500">No users yet.</p>
        )}
      </Section>

      <Section title="Open reports" action={<SeeAll to="/admin/reports" />}>
        {o.recentReports.length ? (
          <ReportList reports={o.recentReports} />
        ) : (
          <p className="text-[15px] text-neutral-500">No open reports.</p>
        )}
      </Section>

      <Section title="Newest stickers" action={<SeeAll to="/admin/stickers" />}>
        {o.recentStickers.length ? (
          <ModeratedStickerList stickers={o.recentStickers} />
        ) : (
          <p className="text-[15px] text-neutral-500">No stickers yet.</p>
        )}
      </Section>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  alert,
}: {
  label: string
  value: number | string
  hint?: string
  alert?: boolean
}) {
  return (
    <>
      <p className="text-[13px] font-medium tracking-[-0.01em] text-neutral-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums",
          alert ? "text-[#d70015]" : "text-neutral-900"
        )}
      >
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[12px] text-neutral-500 tabular-nums">
          {hint}
        </p>
      ) : null}
    </>
  )
}

function SeeAll({
  to,
}: {
  to: "/admin/users" | "/admin/stickers" | "/admin/reports"
}) {
  return (
    <Link
      to={to}
      className="text-[14px] font-semibold tracking-[-0.01em] text-[#0071e3] hover:underline"
    >
      See all
    </Link>
  )
}
