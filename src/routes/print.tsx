import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { PrintStudio } from "@/components/print/print-studio"
import { seo } from "@/lib/seo"

type PrintSearch = {
  from?: "make"
  sheet?: string
  print?: boolean
}

export const Route = createFileRoute("/print")({
  validateSearch: (search: Record<string, unknown>): PrintSearch => ({
    from: search.from === "make" ? "make" : undefined,
    sheet:
      typeof search.sheet === "string" && search.sheet.length > 0
        ? search.sheet
        : undefined,
    print:
      search.print === true || search.print === "1" || search.print === "true"
        ? true
        : undefined,
  }),
  head: () => ({
    meta: seo({
      title: "Print stickers",
      description: "Print your stickers and take the wall offline.",
    }),
  }),
  component: PrintPage,
})

function PrintPage() {
  const { session } = Route.useRouteContext()
  const { from, sheet, print } = Route.useSearch()
  return (
    <AppChrome variant="bare">
      <PrintStudio
        key={from === "make" ? "make" : "book"}
        signedIn={Boolean(session)}
        from={from}
        sheetId={sheet}
        autoprint={Boolean(print)}
      />
    </AppChrome>
  )
}
