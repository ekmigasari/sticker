import { useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { FilterChips } from "@/components/admin/admin-ui"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { VisitorPoint } from "@/lib/visitor"

const METRICS = [
  { id: "daily", label: "Daily" },
  { id: "total", label: "All time" },
] as const

const RANGES = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
] as const

const config = {
  visitors: { label: "Visitors", color: "#0071e3" },
  total: { label: "All time", color: "#0071e3" },
} satisfies ChartConfig

/** Calendar days, so format in UTC to keep the date as stored. */
function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function VisitorChart({ series }: { series: VisitorPoint[] }) {
  const [metric, setMetric] = useState<"daily" | "total">("daily")
  const [range, setRange] = useState<"7" | "30" | "90">("30")
  const data = series.slice(-Number(range))

  const xAxis = (
    <XAxis
      dataKey="day"
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      minTickGap={24}
      tickFormatter={formatDay}
    />
  )
  const yAxis = (
    <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} />
  )
  const tooltip = (
    <ChartTooltip
      cursor={false}
      content={
        <ChartTooltipContent
          labelFormatter={(value) => formatDay(String(value))}
        />
      }
    />
  )

  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-[#f5f5f7] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterChips
          label="Metric"
          options={METRICS}
          value={metric}
          onChange={setMetric}
        />
        <FilterChips
          label="Range"
          options={RANGES}
          value={range}
          onChange={setRange}
        />
      </div>
      <ChartContainer config={config} className="aspect-auto h-60 w-full">
        {metric === "daily" ? (
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0 }}>
            <CartesianGrid vertical={false} />
            {xAxis}
            {yAxis}
            {tooltip}
            <Bar
              dataKey="visitors"
              fill="var(--color-visitors)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0 }}>
            <CartesianGrid vertical={false} />
            {xAxis}
            {yAxis}
            {tooltip}
            <Area
              dataKey="total"
              type="monotone"
              stroke="var(--color-total)"
              strokeWidth={2}
              fill="var(--color-total)"
              fillOpacity={0.12}
            />
          </AreaChart>
        )}
      </ChartContainer>
    </div>
  )
}
