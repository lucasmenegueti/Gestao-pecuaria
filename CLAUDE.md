# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gestão Pecuária NSA** — Offline-first mobile app for daily pasture and cattle management at Fazenda Nossa Senhora Aparecida (Chapada Gaúcha / Januária-MG, ~18,400 hectares). PT-BR only. Android + iOS + Web (dev).

The app is used by field workers ("peões") on tractors/horses in remote pastures with poor connectivity — offline-first storage and large touch targets are hard constraints.

## Repository Layout

- `app/` — Expo/React Native app (primary work)
- `prototipo/` — Historical HTML/CSS prototype (48 files, deployed to GitHub Pages branch `gh-pages` for UX validation). Reference only; don't modify unless doing UX research.
- `CHANGELOG.md` — **Always update** when making a user-visible change. Each entry includes a **Fallback** line pointing to the previous tag for rollback.

### Branches & Tags

- `main` — current development branch
- `claude/nsa-livestock-app-VSLd2` — initial branch, kept as tracking for legacy commits
- `gh-pages` — static HTML prototype only
- Version tags: `v0.1.0` (Protótipo HTML), `v0.2.0` (Protótipo UX Ajustes), `v0.3.0` (App Expo + Refinamentos + Nav Unificada). See `CHANGELOG.md`.

To roll back: `git checkout v0.X.0` (read-only) or `git reset --hard v0.X.0` (destructive).

## Dev Commands (run from `app/`)

```bash
npm start           # interactive Metro (QR for Expo Go)
npm run web         # http://localhost:8081 — requires browser refresh to bundle
npm run android     # emulator or USB device
npm run ios         # Mac only
npx expo start --tunnel  # fallback when LAN/firewall blocks Expo Go
```

No tests, no lint script configured yet. Type check via `npx tsc --noEmit` in `app/`.

### Known gotchas

- **`expo-sqlite` + Web**: requires `.wasm` as bundled asset. `app/metro.config.js` adds `wasm` to `resolver.assetExts`. Don't remove this — SQLite web worker fails to resolve `wa-sqlite.wasm` otherwise.
- **Port 8081 stuck**: `netstat -ano | grep :8081` → `taskkill //F //PID <pid>` (Windows bash).
- **Schema migration**: `app/src/lib/db/provider.tsx` uses `PRAGMA user_version` + `SCHEMA_VERSION` constant. Bump `SCHEMA_VERSION` and list tables to drop in the migration block whenever a table changes shape. Seed tables (users, formulas, grass_types, paddocks, herd) are **not** dropped to preserve fixtures.

## Architecture

### Routing (expo-router, file-based)

```
app/src/app/
├── (auth)/login.tsx              Auth gate (first login online, cached after)
├── (tabs)/                       5 main tabs: index/ronda/rebanho/estoque/mapa
├── ronda/[paddockId]/
│   ├── menu.tsx                  Menu de Avaliação — uses <BottomNav/> for persistent nav
│   └── {supplement,bombona,forage,water,health,fence,weight,washing}/
│       └── step1..N.tsx + summary.tsx
├── admin/                        Formulações, tipos de capim, lotação, mover rebanho
├── estoque/                      Entrada/saída
└── reabastecimento/              3-phase: carregar → rota → resumo
```

Wizards route sequentially (each `step` calls `router.push` to next). `summary.tsx` saves to SQLite and `router.replace`s to `menu.tsx`. **Don't** add `<BottomNav/>` inside wizard steps — it breaks flow integrity. Only main screens and the evaluation menu carry the bottom nav.

### State — Zustand (`app/src/stores/`)

- `authStore` — current user, login/logout
- `rondaStore` — wizard state per ronda section (supplement/bombona/forage/water/health/fence/visualWeight/washing). Each section has its own slice + `updateX`/`resetX` actions. `resetAll` clears everything between rondas.
- `syncStore` — placeholder for Supabase sync

Wizard pattern: step1 calls `resetX()` in `useEffect`, each step calls `updateX({ field })`, summary reads slice and issues INSERT.

### DB (`app/src/lib/db/`)

- `schema.ts` — single `CREATE_TABLES_SQL` string with all `CREATE TABLE IF NOT EXISTS`
- `seed.ts` — single `SEED_SQL` string (users, grass types, formulas, etc.). Seed runs only when `users` table is empty.
- `provider.tsx` — `DatabaseProvider` React context + `useDatabase()` hook. Handles WAL mode, FK enforcement, schema versioning, seed bootstrap.

Each ronda section has its own `*_evals` table FK'd to `rondas.id`. Menu screen queries each for the last `created_at` to show "Últ: DATA" per card.

### UI Components (`app/src/components/ui/`)

Reusable primitives — treat as the design system. Don't introduce new button/input styles; extend existing ones:

- `WizardFlow` — standard wizard container (header, step indicator, VOLTAR/AVANCAR)
- `BinaryChoice` — large SIM/NAO buttons
- `MultiChoice` — radio-list with description and optional icon
- `SliderInput` — numeric with min/max/step/unit
- `PhotoButton` — optional photo capture (never required)
- `ResultCard`, `SummaryRow`, `Badge`, `Card`, `Button` — layout helpers
- `BottomNav` — 5-tab persistent bar (use only on main screens + ronda menu)

## Domain

- **Piquete (Paddock)**: fenced pasture with grass type, area (ha), assigned herd
- **Ronda**: daily field inspection. Core workflow; the app is largely a UI over ronda wizards.
- **Bombona**: per-paddock supplement storage. **Separate from Suplementação** — each has its own item in the evaluation menu and its own eval table (`bombona_evals`).
- **Reabastecimento**: 3-phase tractor route — Load at sede → Distribute to bombonas → Return leftover
- **Lotação**: cab/ha (heads per hectare), per paddock and overall
- **Categorias de gado**: BEZERRO MAMANDO, BEZERRA MAMANDO, BEZERRO, GARROTE, BOI, BEZERRA, NOVILHA, VACA, TOURO
- **Formulações**: supplement formulas (CRUD) — `kg_per_sack`, `target_consumption_g_per_day`
- **Tipos de Capim**: grass types (CRUD) with entry/exit height targets (cm)

### Key calculations (`app/src/constants/index.ts`)

- `calculateSupplementDays(sacks, kgPerSack, heads, gPerDay)` → dias até zerar o cocho
- `calculateStockingRate(heads, ha)` → cab/ha
- `calculateForageAverage(m1, m2, m3)` → média das 3 medidas de altura
- `classifyFence(volts)` → `FORTE` ≥4000 / `ADEQUADO` ≥2000 / `FRACO` ≥1 / `SEM CHOQUE` =0

### Ronda sections — current shape

Section order in `menu.tsx`: Suplementação → Bombona → Forragem → Aguada → Sanidade → Cerca → Peso Visual → Lavagem.

- **Sanidade** stores **`affected_pct` (REAL, 0–100)**, not a count
- **Cerca** asks "evita mistura?" first, voltage second
- **Lavagem** is "did you just wash?" — if no, returns to menu without saving; if yes, 2 screens (photo optional + confirm)
- **Bombona** separate flow: has_stock? → formula → sacks → summary

## UX Principles (hard rules — breaking these regresses the field experience)

- Min 56px touch target, 18px+ font, 1 decision per screen
- Wizard pattern: VOLTAR/AVANCAR, step indicator always visible
- Binary SIM/NAO: 100px+ tall, green/red
- Photos always optional, offered last
- Color-coded by section (see `Colors` in `constants/index.ts`)
- BottomNav on main screens only — never inside an active wizard step

## Conventions

- PT-BR for all user-facing strings (labels, questions, errors)
- File naming: `step1.tsx` ... `stepN.tsx` + `summary.tsx` per wizard folder
- When renumbering wizard steps (e.g., removing a step), keep the original filename to avoid rename churn in imports; just update the `step=` prop and `router.push` target
- Update `CHANGELOG.md` + create a git tag for any user-visible change — see the "Como criar uma nova versão" section in that file

## Auth

Admin creates accounts (no self-registration). First login requires internet; credentials cached in SQLite (`users` table, `password_hash` is placeholder — replace before production). Seeded users: `admin` / `joao.peao` / `maria.peao`, all with password `123456` (dev only).

## Deploying prototype to GitHub Pages

```bash
git checkout gh-pages
git checkout main -- prototipo/
git commit -m "deploy: update gh-pages"
git push -u origin gh-pages
git checkout main
```
