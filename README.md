# xmigas FE Prototype Boilerplate

A minimal prototype boilerplate built with **TanStack Start**, **React**, **TypeScript**, and **shadcn/ui**.

## Stack

- [TanStack Start](https://tanstack.com/start) + React Router — file-based routing, SSR
- [shadcn/ui](https://ui.shadcn.com) — component library (all components installed)
- [shadcn typeset](https://ui.shadcn.com/docs/typeset) — typography / rich-text styling
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [Motion](https://motion.dev) — animation (previously Framer Motion)
- [TanStack Table](https://tanstack.com/table) — headless tables & data grids
- [Zustand](https://zustand.docs.pmnd.rs) — state management
- [Phosphor Icons](https://phosphoricons.com) — icon set
- [Base UI](https://base-ui.com) — unstyled primitives powering the components

## Tooling

- [Oxlint](https://oxc.rs) — linting
- [Oxfmt](https://oxc.rs) — formatting

## Agent skills

This repo pairs with three AI-agent skills. Install them with
[Skills CLI](https://github.com/vercel-labs/agent-skills) so agents can
follow this project's design system, use non-templated taste when building,
and polish interactions. Run from the project root:

```bash
# 1. Design taste — anti-slop frontend skill (build pages that don't look templated)
npx skills add Leonxlnx/taste-skill --skill "design-taste-frontend"

# 2. Emil Kowalski — design engineering & animation polish
npx skills add emilkowalski/skills --skill "emil-design-eng"

# 3. DS Check — index, audit, and maintain the design system
npx skills add ekmigasari/ds-check --skill "ds-check"
```

Use `--agent '*'` (or `-a opencode`, `-a claude`, etc.) to install into a
specific agent, and `--global` to share them across projects. Installing is
idempotent — re-running upgrades to the latest version.

### Skill workflow

Follow this order when building a new page or component:

1. **Add needed components** — `npx shadcn@latest add <component>` so the page
   is built from the shared `@/components/ui` library.
2. **Index the design system** — `ds-check index` creates/refreshes
   `docs/design-system.md` (tokens, typography, style, shared components).
3. **Build the page with the taste skill** — ask the agent to design using the
   `design-taste-frontend` skill, constraining itself to the design-system
   tokens in `docs/design-system.md`.
4. **Audit adherence** — `ds-check audit components` (or a path) verifies the
   new UI uses existing tokens/components, recommending `replace`, `create`,
   `exception`, or `review`.
5. **Polish with Emil** — run the `emil-design-eng` skill to refine
   interaction micro-detail (easing, duration, press feedback, reduced motion).

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `pnpm dev`             | Start the dev server on port 3000 (Nitro / Vercel mode)|
| `pnpm dev:cloudflare`  | Start the dev server in Cloudflare Workers mode       |
| `pnpm build`           | Production build (Nitro — for Vercel / Node)           |
| `pnpm build:cloudflare`| Production build for Cloudflare Workers               |
| `pnpm preview`         | Preview the production build                          |
| `pnpm preview:cloudflare` | Preview the Cloudflare build                     |
| `pnpm deploy:cloudflare` | Build for Cloudflare + `wrangler deploy`            |
| `pnpm cf-typegen`      | Generate Cloudflare env types (`wrangler types`)      |
| `pnpm test`            | Run tests (Vitest)                                    |
| `pnpm lint`            | Lint with Oxlint                                      |
| `pnpm format`          | Format source files with Oxfmt                        |
| `pnpm check`           | Check formatting with Oxfmt                           |
| `pnpm typecheck`       | Type-check with `tsc --noEmit`                        |

## Libraries

- **shadcn typeset** — apply the `.typeset` class to any prose container for consistent markdown-style typography (headings, lists, code, tables, quotes).
- **Motion** — use `motion/react` for animations and scroll-driven reveals.
- **TanStack Table** — headless tables with sorting, filtering, pagination, and virtualisation.
- **Zustand** — lightweight global state via `create()` stores.

## Design system

The theme ships an editorial base:

- **Lora** — display / headings (`font-heading`)
- **Inter** — body / UI (`font-sans`)
- **JetBrains Mono** — labels / code (`font-mono`)
- Warm taupe palette via CSS variables, with a dark mode (`dark:` variant)

## Customizing your style

Before you start building, tweak the boilerplate to your look. Most of it is
driven by tokens in `src/styles.css` and settings in `components.json`.

### 1. Theme & brand colors

`components.json` holds the shadcn settings:

| Field          | Location          | What it controls                         |
| -------------- | ----------------- | ---------------------------------------- |
| `style`        | `components.json` | which shadcn style new components use    |
| `baseColor`    | `components.json` | default color scale for generated tokens |
| `iconLibrary`  | `components.json` | icon set new components import from      |
| `tailwind.css` | `components.json` | stylesheet shadcn edits                  |

The color variables themselves live in `src/styles.css` under `:root` and
`.dark` (e.g. `--background`, `--primary`, `--border`, `--ring`). Change those
values to re-tint every component at once. Regenerate the palette with:

```bash
npx shadcn@latest init
```

### 2. Fonts

Fonts are imported and mapped in `src/styles.css`:

```css
@import "@fontsource-variable/inter";
@import "@fontsource-variable/lora";
@import "@fontsource-variable/jetbrains-mono";
```

The `@theme inline` block maps them to Tailwind tokens:

```css
--font-sans: "Inter Variable", sans-serif; /* body / UI */
--font-heading: "Lora Variable", serif; /* headings */
--font-mono: "JetBrains Mono Variable", monospace; /* labels / code */
```

Swap the import and token to change fonts — e.g. replace the Lora import with
a different face and point `--font-heading` at it. Install packages via
`pnpm add @fontsource-variable/<name>`.

### 3. shadcn typeset

Prose styling is already wired through `src/typeset.css` and the `.typeset`
class. Apply it to any rich-text container:

```tsx
<div className="typeset">
  <h1>Heading</h1>
  <p>Body text.</p>
</div>
```

It uses `--font-heading` / `--font-sans` / `--font-mono`, so changing the fonts
above updates typeset too. See `src/typeset.css` for the full stylesheet.

### 4. Icons

The project uses [Phosphor Icons](https://phosphoricons.com). New components
take their icons from the `iconLibrary` in `components.json`. Import icons
directly in your code:

```tsx
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
```

To switch to another set, change `components.json`'s `iconLibrary` (e.g.
`lucide`, `radix`, `tabler`) and install the matching package.

## Deployment

This project is a [TanStack Start](https://tanstack.com/start) app and can be
deployed to either **Cloudflare Workers** or **Vercel** without code changes.
The deploy target is selected in `vite.config.ts` via the
`VITE_DEPLOY_TARGET` env var:

- unset (default) → `nitro()` plugin → Vercel / Node
- `VITE_DEPLOY_TARGET=cloudflare` → official
  [`@cloudflare/vite-plugin`](https://developers.cloudflare.com/workers/vite-plugin/)
  → Cloudflare Workers

The two server plugins are mutually exclusive, so only one is active per
build. The `dev:cloudflare` / `build:cloudflare` / `deploy:cloudflare`
scripts set the env var for you.

> Windows note: the `:cloudflare` scripts use inline `VITE_DEPLOY_TARGET=…`
> env assignment (macOS/Linux shell syntax). On Windows CMD/PowerShell, set
> the variable manually instead, e.g.
> `$env:VITE_DEPLOY_TARGET="cloudflare"; pnpm build` or install `cross-env`.

### Cloudflare Workers

Config lives in `wrangler.jsonc` (Worker name, `compatibility_date`,
`nodejs_compat` flag, and `main: "@tanstack/react-start/server-entry"`,
which the framework provides — do not change `main`).

```bash
# 1. Log in (once per machine)
pnpm dlx wrangler login
pnpm dlx wrangler whoami   # verify

# 2. (Optional) generate typed bindings for env / KV / R2 / D1
pnpm cf-typegen

# 3. Local dev against the Workers runtime (workerd)
pnpm dev:cloudflare

# 4. Deploy — builds with the Cloudflare plugin, then uploads
pnpm deploy:cloudflare
```

First deploy prints a `*.workers.dev` URL. Point a custom domain at it from
the Cloudflare dashboard whenever ready
(Workers & Pages → your Worker → Settings → Domains & Routes).

**Environment variables / secrets:**

```bash
pnpm dlx wrangler secret put DATABASE_URL
pnpm dlx wrangler secret put MY_SECRET_KEY
pnpm dlx wrangler secret list   # confirm what's set
```

Non-secret vars can go in `wrangler.jsonc` under `"vars"`. Secrets must use
`wrangler secret put` (or the dashboard) — never commit them. After adding a
new required env var, re-run `pnpm deploy:cloudflare`.

**Git auto-deploys:** Cloudflare dashboard → Workers & Pages → Create →
connect your GitHub repo. Build command: `pnpm build:cloudflare`,
deploy command: `pnpm deploy:cloudflare` (or just `npx wrangler deploy`,
since the build already ran).

**Troubleshooting:**

- `500` on every route after deploy → usually a missing secret or a Node API
  without `nodejs_compat`. Keep `"compatibility_flags": ["nodejs_compat"]`
  in `wrangler.jsonc`.
- Keep `compatibility_date` reasonably current (it pins the Workers runtime
  behavior). Bump it, then re-deploy.
- Tail logs: `pnpm dlx wrangler tail`.

### Vercel

Vercel support is already wired up: the default build uses the
[`nitro()`](https://nitro.build) Vite plugin (which compiles the server to
Vercel Functions, on Fluid compute by default) and `vercel.json` pins the
`tanstack-start` framework preset. No extra config needed.

**Option A — deploy from Git (recommended):**

1. Commit and push to GitHub / GitLab / Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Confirm the framework preset reads **TanStack Start**, then Deploy.

Every push to `main` triggers a new deployment; every PR gets a Preview
deployment.

**Option B — deploy from the CLI:**

```bash
npm i -g vercel
vercel        # preview deployment (links the project on first run)
vercel --prod # production deployment
```

**Environment variables:**

```bash
vercel env add MY_KEY
```

or add them in the dashboard under Project → Settings → Environment
Variables (Production / Preview / Development). Existing deployments keep
the values they were built with — redeploy after changing vars.
