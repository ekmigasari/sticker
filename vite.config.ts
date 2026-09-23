import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { nitro } from "nitro/vite"
import { cloudflare } from "@cloudflare/vite-plugin"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// Dual deploy target:
// - Default (nitro) → Vercel / Node. Vercel auto-detects TanStack Start + Nitro.
// - Cloudflare Workers → set VITE_DEPLOY_TARGET=cloudflare (see `dev:cloudflare`
//   / `build:cloudflare` scripts). Uses the official @cloudflare/vite-plugin,
//   which is mutually exclusive with the nitro() plugin, so only one is active.
const isCloudflare = process.env.VITE_DEPLOY_TARGET === "cloudflare"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    // Must come before tanstackStart() per Cloudflare docs.
    ...(isCloudflare ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
    tanstackStart(),
    ...(!isCloudflare ? [nitro()] : []),
    viteReact(),
  ],
})
