import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { useEffect } from "react"
import { recordPageVisit } from "@/lib/analytics"
import { getSession } from "@/lib/session"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  beforeLoad: async () => {
    const session = await getSession()
    return { session }
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "theme-color",
        content: "#ffffff",
      },
      {
        name: "description",
        content:
          "CoolThingsOnTheInternet: cool things made by people on the internet. Make a sticker and put it on the wall.",
      },
      {
        title: "CoolThingsOnTheInternet",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="mx-auto max-w-lg px-6 py-24 text-center font-ui">
      <h1 className="font-hand text-[56px] leading-none font-bold text-neutral-900">
        404
      </h1>
      <p className="mt-2 text-[15px] text-neutral-500">
        That sticker peeled off the wall.
      </p>
    </main>
  ),
  shellComponent: RootDocument,
})

const umamiScriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL
const umamiWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID

/** Must exist before the tracker loads. Drops admin pages so our own moderation doesn't count. */
const umamiBeforeSend = `window.umamiBeforeSend=function(t,p){try{if(/^\\/admin(\\/|$)/.test(new URL(p.url,location.origin).pathname))return false}catch(e){}return p}`

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(recordPageVisit, [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
        {umamiScriptUrl && umamiWebsiteId ? (
          <>
            <script dangerouslySetInnerHTML={{ __html: umamiBeforeSend }} />
            <script
              defer
              src={umamiScriptUrl}
              data-website-id={umamiWebsiteId}
              data-before-send="umamiBeforeSend"
            />
          </>
        ) : null}
      </head>
      <body>
        {children}
        {import.meta.env.DEV && import.meta.env.VITE_SHOW_DEVTOOLS === "1" ? (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
