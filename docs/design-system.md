# Design System

## Scope

- Framework and styling approach: React 19 + TanStack Router/Start, Vite 8, TypeScript 6. Tailwind CSS v4 with `@tailwindcss/vite`, `tw-animate-css`, and `class-variance-authority`. UI primitives from `@base-ui/react`. shadcn v4 preset `base-sera` (taupe base color).
- Themes: Light (`:root`) and dark (`.dark` class). OKLCH color space throughout.
- Index status: observed

## Sources and paths

| Path | Role | Status | Notes |
| --- | --- | --- | --- |
| `src/styles.css` | global token source | source | CSS custom properties (`:root`, `.dark`), Tailwind `@theme inline` bridge, base layer reset, typeset context presets |
| `src/typeset.css` | typography system | source | shadcn/typeset — markdown prose styling under `.typeset` class |
| `components.json` | shadcn config | source | `base-sera` style, taupe base, CSS variables enabled, phosphor icons |
| `src/components/ui/` | shared UI components | source | 61 components, all using `data-slot`, `cn()`, CVA variants, `@base-ui/react` primitives |
| `src/lib/utils.ts` | utility re-export | source | Re-exports `cn` from the `cn` package |
| `src/routes/__root.tsx` | root layout | consumer | Imports `styles.css` via `?url`, sets `<html lang="en">` |
| `.output/public/assets/styles-Brxsm91g.css` | generated build output | generated | Compiled Tailwind output — do not edit directly |

## Tokens

### Colors

All values in OKLCH. The `@theme inline` block in `src/styles.css:80–122` maps these to Tailwind color utilities via `--color-*` aliases.

#### Semantic tokens — Light (`:root`)

| Role | Token | Value | Source |
| --- | --- | --- | --- |
| Background | `--background` | `oklch(1 0 0)` | `src/styles.css:12` |
| Foreground | `--foreground` | `oklch(0.147 0.004 49.3)` | `src/styles.css:13` |
| Card | `--card` | `oklch(1 0 0)` | `src/styles.css:14` |
| Card foreground | `--card-foreground` | `oklch(0.147 0.004 49.3)` | `src/styles.css:15` |
| Popover | `--popover` | `oklch(1 0 0)` | `src/styles.css:16` |
| Popover foreground | `--popover-foreground` | `oklch(0.147 0.004 49.3)` | `src/styles.css:17` |
| Primary | `--primary` | `oklch(0.214 0.009 43.1)` | `src/styles.css:18` |
| Primary foreground | `--primary-foreground` | `oklch(0.986 0.002 67.8)` | `src/styles.css:19` |
| Secondary | `--secondary` | `oklch(0.96 0.002 17.2)` | `src/styles.css:20` |
| Secondary foreground | `--secondary-foreground` | `oklch(0.214 0.009 43.1)` | `src/styles.css:21` |
| Muted | `--muted` | `oklch(0.96 0.002 17.2)` | `src/styles.css:22` |
| Muted foreground | `--muted-foreground` | `oklch(0.547 0.021 43.1)` | `src/styles.css:23` |
| Accent | `--accent` | `oklch(0.96 0.002 17.2)` | `src/styles.css:24` |
| Accent foreground | `--accent-foreground` | `oklch(0.214 0.009 43.1)` | `src/styles.css:25` |
| Destructive | `--destructive` | `oklch(0.577 0.245 27.325)` | `src/styles.css:26` |
| Border | `--border` | `oklch(0.922 0.005 34.3)` | `src/styles.css:27` |
| Input | `--input` | `oklch(0.922 0.005 34.3)` | `src/styles.css:28` |
| Ring | `--ring` | `oklch(0.714 0.014 41.2)` | `src/styles.css:29` |
| Chart 1 | `--chart-1` | `oklch(0.879 0.169 91.605)` | `src/styles.css:30` |
| Chart 2 | `--chart-2` | `oklch(0.769 0.188 70.08)` | `src/styles.css:31` |
| Chart 3 | `--chart-3` | `oklch(0.666 0.179 58.318)` | `src/styles.css:32` |
| Chart 4 | `--chart-4` | `oklch(0.555 0.163 48.998)` | `src/styles.css:33` |
| Chart 5 | `--chart-5` | `oklch(0.473 0.137 46.201)` | `src/styles.css:34` |
| Sidebar | `--sidebar` | `oklch(0.986 0.002 67.8)` | `src/styles.css:36` |
| Sidebar foreground | `--sidebar-foreground` | `oklch(0.147 0.004 49.3)` | `src/styles.css:37` |
| Sidebar primary | `--sidebar-primary` | `oklch(0.214 0.009 43.1)` | `src/styles.css:38` |
| Sidebar primary foreground | `--sidebar-primary-foreground` | `oklch(0.986 0.002 67.8)` | `src/styles.css:39` |
| Sidebar accent | `--sidebar-accent` | `oklch(0.96 0.002 17.2)` | `src/styles.css:40` |
| Sidebar accent foreground | `--sidebar-accent-foreground` | `oklch(0.214 0.009 43.1)` | `src/styles.css:41` |
| Sidebar border | `--sidebar-border` | `oklch(0.922 0.005 34.3)` | `src/styles.css:42` |
| Sidebar ring | `--sidebar-ring` | `oklch(0.714 0.014 41.2)` | `src/styles.css:43` |

#### Semantic tokens — Dark (`.dark`)

| Role | Token | Value | Source |
| --- | --- | --- | --- |
| Background | `--background` | `oklch(0.147 0.004 49.3)` | `src/styles.css:47` |
| Foreground | `--foreground` | `oklch(0.986 0.002 67.8)` | `src/styles.css:48` |
| Card | `--card` | `oklch(0.214 0.009 43.1)` | `src/styles.css:49` |
| Card foreground | `--card-foreground` | `oklch(0.986 0.002 67.8)` | `src/styles.css:50` |
| Popover | `--popover` | `oklch(0.214 0.009 43.1)` | `src/styles.css:51` |
| Popover foreground | `--popover-foreground` | `oklch(0.986 0.002 67.8)` | `src/styles.css:52` |
| Primary | `--primary` | `oklch(0.922 0.005 34.3)` | `src/styles.css:53` |
| Primary foreground | `--primary-foreground` | `oklch(0.214 0.009 43.1)` | `src/styles.css:54` |
| Secondary | `--secondary` | `oklch(0.268 0.011 36.5)` | `src/styles.css:55` |
| Secondary foreground | `--secondary-foreground` | `oklch(0.986 0.002 67.8)` | `src/styles.css:56` |
| Muted | `--muted` | `oklch(0.268 0.011 36.5)` | `src/styles.css:57` |
| Muted foreground | `--muted-foreground` | `oklch(0.714 0.014 41.2)` | `src/styles.css:58` |
| Accent | `--accent` | `oklch(0.268 0.011 36.5)` | `src/styles.css:59` |
| Accent foreground | `--accent-foreground` | `oklch(0.986 0.002 67.8)` | `src/styles.css:60` |
| Destructive | `--destructive` | `oklch(0.704 0.191 22.216)` | `src/styles.css:61` |
| Border | `--border` | `oklch(1 0 0 / 10%)` | `src/styles.css:62` |
| Input | `--input` | `oklch(1 0 0 / 15%)` | `src/styles.css:63` |
| Ring | `--ring` | `oklch(0.547 0.021 43.1)` | `src/styles.css:64` |
| Chart 1–5 | `--chart-{1-5}` | identical to light | `src/styles.css:65–69` |
| Sidebar | `--sidebar` | `oklch(0.214 0.009 43.1)` | `src/styles.css:70` |
| Sidebar foreground | `--sidebar-foreground` | `oklch(0.986 0.002 67.8)` | `src/styles.css:71` |
| Sidebar primary | `--sidebar-primary` | `oklch(0.488 0.243 264.376)` | `src/styles.css:72` |
| Sidebar primary foreground | `--sidebar-primary-foreground` | `oklch(0.986 0.002 67.8)` | `src/styles.css:73` |
| Sidebar accent | `--sidebar-accent` | `oklch(0.268 0.011 36.5)` | `src/styles.css:74` |
| Sidebar accent foreground | `--sidebar-accent-foreground` | `oklch(0.986 0.002 67.8)` | `src/styles.css:75` |
| Sidebar border | `--sidebar-border` | `oklch(1 0 0 / 10%)` | `src/styles.css:76` |
| Sidebar ring | `--sidebar-ring` | `oklch(0.547 0.021 43.1)` | `src/styles.css:77` |

### Typography

#### Font families

| Role | Token | Value | Source |
| --- | --- | --- | --- |
| Sans (body) | `--font-sans` | `"Inter Variable", sans-serif` | `src/styles.css:81` |
| Heading | `--font-heading` | `"Lora Variable", serif` | `src/styles.css:82` |
| Mono | `--font-mono` | `"JetBrains Mono Variable", monospace` | `src/styles.css:83` |

Loaded via `@fontsource-variable/inter`, `@fontsource-variable/lora`, `@fontsource-variable/jetbrains-mono` in `src/styles.css:4–6`.

#### Typeset system (`src/typeset.css`)

| Category | Tokens / values | Source | Usage |
| --- | --- | --- | --- |
| Base size | `--typeset-size: 1em` (mobile: `×1.125`) | `src/typeset.css:11, 20–28` | `.typeset` class |
| Line-height | `--typeset-leading: 1.75` | `src/typeset.css:12` | `.typeset` class |
| Vertical flow | `--typeset-flow: 1.25em` | `src/typeset.css:13` | Block spacing between elements |
| Muted color | `--typeset-muted: var(--color-muted-foreground)` | `src/typeset.css:30–33` | Secondary text in prose |
| Rule color | `--typeset-rule: var(--color-border)` | `src/typeset.css:34–37` | Borders, dividers in prose |
| H1 | `1.75em / 1.3` | `src/typeset.css:62–66` | Heading level 1 |
| H2 | `1.25em / 1.4` | `src/typeset.css:67–70` | Heading level 2 |
| H3 | `1.125em / 1.45` | `src/typeset.css:72–75` | Heading level 3 |
| H4 | `1em / 1.5` | `src/typeset.css:77–80` | Heading level 4 |
| H5 | `0.875em / 1.5`, weight 500 | `src/typeset.css:82–87` | Heading level 5 |
| H6 | `0.8125em / 1.5`, weight 500, `letter-spacing: 0.08em`, uppercase | `src/typeset.css:89–97` | Heading level 6 |
| Headings | `font-family: var(--typeset-font-heading)`, weight 600 | `src/typeset.css:56–61` | All heading elements |
| Links | weight 500, underline `text-decoration-color: color-mix(in oklab, currentColor 30%, transparent)` | `src/typeset.css:112–125` | Anchor elements |
| Inline code | `font-size: 0.85em`, mono font, `border-radius: min(calc(var(--radius, 0.5em) * 0.6), 0.35em)` | `src/typeset.css:273–282` | `code` not in `pre` |
| Code blocks | `font-size: 0.875em`, `line-height: 1.5`, `tab-size: 2`, `border-radius: var(--radius, 0.5em)` | `src/typeset.css:285–307` | `pre` elements |

#### Typeset presets (`src/styles.css`)

| Preset | Body | Heading | Mono | Size | Leading | Flow | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.typeset-docs` | `var(--font-sans)` | `var(--font-heading)` | `var(--font-mono)` | `15px` | `1.75` | `1.25em` | `src/styles.css:140–147` |
| `.typeset-chat` | `var(--font-sans)` | `var(--font-sans)` | `var(--font-mono)` | `15px` | `1.75` | `1.25em` | `src/styles.css:149–156` |
| `.typeset-article` | `var(--font-sans)` | `var(--font-sans)` | `var(--font-mono)` | `15px` | `1.75` | `1.25em` | `src/styles.css:158–165` |

### Style

| Category | Tokens / values | Source | Usage |
| --- | --- | --- | --- |
| Base radius | `--radius: 0.625rem` | `src/styles.css:35` | All rounded corners derive from this |
| Radius scale | `--radius-sm: calc(var(--radius) * 0.6)`, `--radius-md: calc(var(--radius) * 0.8)`, `--radius-lg: var(--radius)`, `--radius-xl: calc(var(--radius) * 1.4)`, `--radius-2xl: calc(var(--radius) * 1.8)`, `--radius-3xl: calc(var(--radius) * 2.2)`, `--radius-4xl: calc(var(--radius) * 2.6)` | `src/styles.css:115–121` | Tailwind `rounded-*` utilities |
| Component radius override | Most components use `rounded-none` (sharp corners) | All UI components | Sharp-corner aesthetic is the default |
| Card spacing | `--card-spacing: --spacing(8)` (default), `data-[size=sm]: --spacing(5)` | `src/components/ui/card.tsx:14` | Card internal padding |
| Focus | `focus-visible:ring-2 focus-visible:ring-ring/30` (button), `focus-visible:border-ring` | `src/components/ui/button.tsx:7` | Focus ring pattern |
| Focus (typeset) | `outline: 2px solid var(--color-ring, currentColor)`, `outline-offset: 2px` | `src/typeset.css:122–125` | Focus ring for prose links |
| Motion | `tw-animate-css` library, `animate-in`, `fade-in-0`, `zoom-in-95`, `animate-out`, `fade-out-0`, `zoom-out-95`, `animate-spin` | Various components | Entrance/exit animations |
| Motion (drawer) | `duration-450 ease-[cubic-bezier(0.22,1,0.36,1)]`, `will-change-transform` | `src/components/ui/drawer.tsx:124` | Drawer slide transitions |
| Motion (toast) | `transition: transform 500ms cubic-bezier(0.22,1,0.36,1)`, `will-change-transform` | `src/components/ui/toast.tsx:47` | Toast stack transitions |
| Spacing | Tailwind spacing scale (`--spacing`), used via utility classes | Tailwind v4 | All layout spacing |
| Base layer | `* { @apply border-border outline-ring/50 }`, `body { @apply bg-background text-foreground }`, `html { @apply font-sans }` | `src/styles.css:124–138` | Global defaults |

## Shared UI components

| Component | Path | Variants / states | Use for |
| --- | --- | --- | --- |
| Accordion | `src/components/ui/accordion.tsx` | — | Collapsible sections |
| Alert | `src/components/ui/alert.tsx` | — | Inline status messages |
| Alert Dialog | `src/components/ui/alert-dialog.tsx` | — | Confirmation modals |
| Aspect Ratio | `src/components/ui/aspect-ratio.tsx` | — | Responsive media containers |
| Attachment | `src/components/ui/attachment.tsx` | — | File attachment display |
| Avatar | `src/components/ui/avatar.tsx` | — | User profile images |
| Badge | `src/components/ui/badge.tsx` | `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` | Status labels, counters |
| Bubble | `src/components/ui/bubble.tsx` | `default`, `secondary`, `muted`, `tinted`, `outline`, `ghost`, `destructive` | Chat message bubbles |
| Breadcrumb | `src/components/ui/breadcrumb.tsx` | — | Navigation trails |
| Button | `src/components/ui/button.tsx` | variant: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. size: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg` | Primary actions, triggers |
| Button Group | `src/components/ui/button-group.tsx` | — | Grouped button layouts |
| Calendar | `src/components/ui/calendar.tsx` | — | Date picker calendar |
| Card | `src/components/ui/card.tsx` | size: `default`, `sm`. Parts: Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter | Content containers |
| Carousel | `src/components/ui/carousel.tsx` | — | Image/content carousels |
| Chart | `src/components/ui/chart.tsx` | — | Data visualizations |
| Checkbox | `src/components/ui/checkbox.tsx` | — | Boolean inputs |
| Collapsible | `src/components/ui/collapsible.tsx` | — | Toggleable content |
| Combobox | `src/components/ui/combobox.tsx` | — | Searchable select inputs |
| Command | `src/components/ui/command.tsx` | — | Command palette / search |
| Context Menu | `src/components/ui/context-menu.tsx` | — | Right-click menus |
| Dialog | `src/components/ui/dialog.tsx` | Parts: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose | Modal dialogs |
| Direction | `src/components/ui/direction.tsx` | — | RTL support wrapper |
| Drawer | `src/components/ui/drawer.tsx` | swipeDirection: `up`, `down`, `left`, `right`. Parts: Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerOverlay, DrawerSwipeHandle | Bottom/side sheet drawers |
| Dropdown Menu | `src/components/ui/dropdown-menu.tsx` | — | Dropdown menus |
| Empty | `src/components/ui/empty.tsx` | — | Empty state placeholders |
| Field | `src/components/ui/field.tsx` | — | Form field wrapper |
| Hover Card | `src/components/ui/hover-card.tsx` | — | Hover previews |
| Input | `src/components/ui/input.tsx` | — | Text input (underline style) |
| Input Group | `src/components/ui/input-group.tsx` | — | Grouped input layouts |
| Input OTP | `src/components/ui/input-otp.tsx` | — | OTP code input |
| Item | `src/components/ui/item.tsx` | — | List item component |
| Kbd | `src/components/ui/kbd.tsx` | — | Keyboard shortcut display |
| Label | `src/components/ui/label.tsx` | — | Form labels |
| Marker | `src/components/ui/marker.tsx` | — | Highlight/marker tool |
| Menubar | `src/components/ui/menubar.tsx` | — | Application menubar |
| Message | `src/components/ui/message.tsx` | — | Chat message wrapper |
| Message Scroller | `src/components/ui/message-scroller.tsx` | — | Scrollable message container |
| Native Select | `src/components/ui/native-select.tsx` | — | Native HTML select |
| Navigation Menu | `src/components/ui/navigation-menu.tsx` | — | Top navigation |
| Pagination | `src/components/ui/pagination.tsx` | — | Page navigation |
| Popover | `src/components/ui/popover.tsx` | — | Floating panels |
| Progress | `src/components/ui/progress.tsx` | — | Progress bars |
| Questionnaire | `src/components/ui/questionnaire.tsx` | — | Form questionnaires |
| Radio Group | `src/components/ui/radio-group.tsx` | — | Radio button groups |
| Resizable | `src/components/ui/resizable.tsx` | — | Resizable panel layouts |
| Scroll Area | `src/components/ui/scroll-area.tsx` | — | Custom scroll containers |
| Select | `src/components/ui/select.tsx` | — | Custom select dropdowns |
| Separator | `src/components/ui/separator.tsx` | — | Visual dividers |
| Sheet | `src/components/ui/sheet.tsx` | — | Slide-in panels |
| Sidebar | `src/components/ui/sidebar.tsx` | variant: `sidebar`, `floating`, `inset`. collapsible: `offcanvas`, `icon`, `none`. Parts: Sidebar, SidebarProvider, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarTrigger, SidebarRail, SidebarInset | Application sidebar |
| Skeleton | `src/components/ui/skeleton.tsx` | — | Loading placeholders |
| Slider | `src/components/ui/slider.tsx` | — | Range sliders |
| Spinner | `src/components/ui/spinner.tsx` | — | Loading spinners |
| Switch | `src/components/ui/switch.tsx` | — | Toggle switches |
| Table | `src/components/ui/table.tsx` | — | Data tables |
| Tabs | `src/components/ui/tabs.tsx` | — | Tabbed interfaces |
| Textarea | `src/components/ui/textarea.tsx` | — | Multi-line text input |
| Toast | `src/components/ui/toast.tsx` | type: `success`, `info`, `warning`, `error`, `loading`. Parts: Toaster, Toast, ToastContent, ToastTitle, ToastDescription, ToastAction, ToastClose, ToastIcon | Notification toasts |
| Toggle | `src/components/ui/toggle.tsx` | — | Toggle buttons |
| Toggle Group | `src/components/ui/toggle-group.tsx` | — | Toggle button groups |
| Tooltip | `src/components/ui/tooltip.tsx` | — | Hover tooltips |

## Component patterns

- All components use `data-slot` attributes for CSS targeting.
- Class merging via `cn()` (from the `cn` package, re-exported through `src/lib/utils.ts`).
- Variant definitions use `class-variance-authority` (CVA).
- Primitives from `@base-ui/react` (Base UI). Components use `render` prop from `@base-ui/react/use-render` for polymorphic rendering.
- Icons from `@phosphor-icons/react`.
- Sharp corners (`rounded-none`) is the dominant aesthetic across all components.
- Component titles (CardTitle, DialogTitle, DrawerTitle) share the pattern: `font-heading text-lg font-semibold tracking-wider uppercase`.
- Component descriptions (CardDescription, DialogDescription, DrawerDescription) share: `text-sm leading-relaxed text-muted-foreground`.

## Usage rules

- Prefer semantic tokens (`bg-primary`, `text-muted-foreground`) over literal visual values.
- Prefer shared UI components over locally duplicated controls.
- Use `rounded-none` for sharp corners (project default). Only deviate for specific use cases.
- Use `data-slot` selectors for component-scoped styling when composing.
- Use `.typeset` class for rich text/prose areas, with an appropriate preset (`.typeset-docs`, `.typeset-chat`, `.typeset-article`).
- Use `--card-spacing` for card internal padding (respects size variants).

## Gaps and decisions

| Item | Decision | Evidence | Follow-up |
| --- | --- | --- | --- |
| Dark mode toggle implementation not visible in routes | Token values are fully defined but no theme switching mechanism found in root layout. | `src/routes/__root.tsx` — no `className="dark"` or theme provider | Confirm whether dark mode is toggled elsewhere or not yet wired. |
| No explicit spacing tokens beyond Tailwind's `--spacing` scale | Spacing is handled entirely through Tailwind utility classes. No custom spacing tokens. | `src/styles.css` — no `--spacing-*` custom properties | Acceptable for Tailwind v4 projects; document any ad-hoc spacing values if they appear. |
| Some components use inline `color-mix()` or `oklch()` overrides in class strings | e.g., Button secondary variant uses `hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]`. These are functional but not tokenized. | `src/components/ui/button.tsx:15`, `src/components/ui/bubble.tsx:26,28` | Consider extracting to semantic tokens if the pattern repeats widely. |
