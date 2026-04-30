# SKILL.md — NSA Design System

> Instructions for future chats. Read this first when asked to design anything for NSA / Fazenda N.S.A.

## What this project is

A design system + three UI kits for a Brazilian farm management operation called **Fazenda N.S.A**. Read `README.md` for full context; this file is the short operating guide.

## Tokens live in one place

`colors_and_type.css` at the project root is the single source of truth for:
- All brand + semantic + neutral color variables (`--nsa-green`, `--semantic-ok-fg`, `--ink-muted`, etc.)
- `@import` for Inter (400/500/600/700) and Lora (600/700) from Google Fonts

Any HTML file that needs brand styling should `<link rel="stylesheet" href="../../colors_and_type.css">` (adjust relative path). **Never hardcode brand hex values** — read them from the tokens.

## UI kit conventions

All three UI kits use inline React + Babel. Required boilerplate in every kit's `index.html`:

```html
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
<script src="https://unpkg.com/lucide@latest"></script>
```

Components are split into files and glued via `Object.assign(window, {...})` at the end of each `.jsx`. **Never name a style object `styles`** — collisions break the page. Prefix: `kpiStyles`, `tableStyles`, etc.

Lucide icons: `stroke-width: 1.75`, call `window.lucide.createIcons()` after each render.

## Writing rules

- **Language: Brazilian Portuguese (pt-BR)** for all user-facing copy. Technical labels (e.g. column headers) in pt-BR too.
- **Data formatting:** `R$ 1,74 M`, `65,8 sc/ha`, `3.675 cab.`, dates `18/abr 07:30`.
- **Tabular numerals** on every column of numbers. Use `fontVariantNumeric: 'tabular-nums'`.
- **No emoji** unless explicitly asked. No decorative icons. No gradients. No glassmorphism.

## When adding a new view / screen

1. Read the matching UI kit's `README.md` first (`ui_kits/dashboard/README.md`, etc.)
2. Match the existing patterns: KPI row on top, title with caption eyebrow above it, primary action in top-right of the content area or as sticky button.
3. Reuse `KPICard`, `DataTable`, `Sparkline`, etc. Don't reinvent.
4. Status pills always use the 4 semantic tokens (`ok` / `warn` / `danger` / `info`) — same shape, same sizes, same 5px dot.
5. New assets (photos, logos) go in `assets/` — never reference files outside the project.

## When the client requests a new brand asset

Brand review happens via the **asset review pane**. Flagged cards point to `preview/brand-*.html`. Edit those files in place and call `show_to_user(path)` — the review pane refreshes the card. Do not create new files for regenerated assets.

## When asked to build a new UI kit

Put it in `ui_kits/<kit_name>/` with this structure:
```
index.html      ← entry w/ React+Babel boilerplate + link to colors_and_type.css
App.jsx         ← top-level component, ReactDOM.createRoot
<Views>.jsx     ← one file per screen/view
<Components>.jsx ← shared atoms
README.md       ← purpose, components, design notes
```
Register the kit's `index.html` as an asset (group: `Brand`, subtitle describing the kit).

## What is deliberately NOT here

- No build system, no TypeScript, no Tailwind, no CSS-in-JS framework. Inline styles + CSS variables is the whole styling story.
- No dark mode (yet — noted as a future step).
- No i18n framework — pt-BR only.
- No accessibility audit docs (but: every interactive control has a visible label, hit targets ≥44px on mobile, contrast ≥4.5:1 on text).
