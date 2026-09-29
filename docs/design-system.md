# Design System

## Scope

- Framework and styling approach: React 19 + TanStack Router/Start, Vite, TypeScript. Tailwind CSS v4 with `@tailwindcss/vite`, `tw-animate-css`, and `class-variance-authority`. UI primitives from `@base-ui/react`. shadcn components under `src/components/ui/`.
- Visual language: **Netkraft Apple** — white canvas, near-black ink, soft gray surfaces (`#f5f5f7`), pill CTAs, SF/Geist UI stack. Reference surface: `/make`.
- Themes: Light (`:root`) primary; dark (`.dark`) supported via tokens.
- Index status: observed (aligned to Make / dashboard / directory, 2026-03)

## Sources and paths

| Path | Role | Status | Notes |
| --- | --- | --- | --- |
| `src/styles.css` | global token source | source | CSS custom properties, `@theme inline`, `.nk-*` page helpers, motion utilities |
| `src/typeset.css` | typography system | source | shadcn/typeset under `.typeset` |
| `components.json` | shadcn config | source | phosphor icons, CSS variables |
| `src/components/ui/` | shared UI components | source | Prefer `.nk-*` + Make patterns on product pages |
| `src/components/make/` | reference craft UI | consumer | Canonical Apple mobile chrome |

## Tokens

### Colors (light)

| Role | Token | Value |
| --- | --- | --- |
| Background | `--background` | `oklch(1 0 0)` (white) |
| Foreground / ink | `--foreground` / `--ink` | `oklch(0.21 0.005 260)` |
| Surface | `--surface` / `--muted` | `oklch(0.965 0.002 260)` ≈ `#f5f5f7` |
| Primary | `--primary` | near-black (same as ink) |
| Border / hairline | `--border` / `--hairline` | ink at 6–8% |
| Destructive | `--destructive` | red OKLCH |

Product UI also uses Tailwind neutrals (`neutral-900`, `neutral-500`, `black/[0.06]`) to match Make.

### Typography

| Role | Token | Value |
| --- | --- | --- |
| UI / body | `--font-ui` / `--font-sans` | SF Pro / Geist Variable / system-ui |
| Heading | `--font-heading` | SF Pro Display / Geist Variable |
| Mono | `--font-mono` | Geist Variable / ui-monospace |

Default `html` uses `font-ui`. Titles: ~40–48px semibold, tracking `-0.035em`. Body support: 15–17px, `neutral-500`.

### Style

| Category | Values |
| --- | --- |
| Radius | `--radius: 1rem`; pills `rounded-full` for CTAs/chips; panels `rounded-[24px]`–`rounded-[28px]` |
| Surfaces | White page; inset fields/panels `#f5f5f7`; hairline `border-black/[0.06]` |
| Buttons | `.nk-btn` (black pill), `.nk-btn-secondary` (soft gray pill) |
| Fields | `.nk-field`, `.nk-textarea` |
| Chips | `.nk-chip` + active/idle |
| Page shell | `.nk-page`, `.nk-title`, `.nk-subtitle`, `.nk-label` |
| Press | `.press` → scale `0.97`, 160ms `--ease-out` |
| Motion | Entrance opacity/y 6–8px, 280ms `cubic-bezier(0.23, 1, 0.32, 1)` |

## Product model (copy)

- **Sticker = product.** Title, short description, link, category are the listing.
- Artwork is crafted in Make; wall placement comes after sign-in + setup.
- Dashboard lists “Your stickers”; directory is the public sticker catalog.

## Components

Prefer existing `@/components/ui/*` for primitives. For Netkraft product surfaces (dashboard, directory, auth, place details), compose with `.nk-*` helpers rather than kraft/editorial card chrome.

## Do / Don’t

- Do match `/make`: white, black pills, soft gray chips, mobile-first.
- Do keep hairlines subtle; avoid heavy card shadows.
- Don’t reintroduce cork/kraft teal-mustard palettes or Nunito/DM Sans display stacks on product pages.
- Don’t put secondary marketing blocks in the Make first viewport.
- Wall homepage (`/`) may keep its own immersion; don’t restyle it via dashboard patterns until wall work resumes.
