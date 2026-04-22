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
- Version tags: `v0.1.0`..`v0.3.0` (iterações iniciais do app), `v0.5.x` (design system NSA + sync Supabase), `v0.6.0 RC1.4` (release candidate atual). Tags auxiliares: `pre-redesign-v0.5.3`, `pre-e2e-investigation`, `pre-bug-fixes` (checkpoints de rollback). See `CHANGELOG.md`.

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

## Dev / Release Flow (obrigatório)

Toda alteração passa por três estágios, **nessa ordem**. NÃO pular estágio — cada um pega classe diferente de bug.

1. **Local (Expo Go no Tab A9)** — `npx expo start --tunnel` na máquina do Lucas, Tab A9 escaneia QR no Expo Go (app gratuito na Play Store). Hot reload em segundos. **Pega:** bugs de JS, layout, lógica, rotas, sync, DB, SQL. **Não pega:** tiles empacotados (Expo Go não tem `assets/tiles/` do app), native modules novos (só via prebuild), permissões nativas alteradas em app.json.
2. **APK preview (EAS Build)** — `eas build --profile preview --platform android --non-interactive --no-wait`. ~15-25 min na cloud. URL do `.apk` no final, Tab A9 baixa pelo Chrome e instala. **Pega:** o que o Expo Go não pega (tiles, native modules, edge-to-edge, permissões). Valida em ambiente igualzinho ao de produção, sem passar pelas lojas.
3. **Produção (Google Play + App Store — ainda a ser criada)** — `eas build --profile production --platform all` + `eas submit --profile production --platform all`. Review Apple ~24h na primeira build. Peões instalam via Play Store / TestFlight.

**Regra de ouro:** não sobe pro estágio N+1 sem validação OK no estágio N. Se algo quebra no APK preview mas não no Expo Go, investigar antes de empurrar pra loja — comum ser diferença de runtime nativo.

### Como iniciar dev local

```bash
cd app
npx expo start --tunnel
```

Deixa rodando. Terminal mostra QR code. Tab A9 abre **Expo Go** → "Scan QR code" → scan → carrega o app do metro. Hot-reload em qualquer edit de JS/TS.

### Known gotchas

- **`expo-sqlite` + Web**: requires `.wasm` as bundled asset. `app/metro.config.js` adds `wasm` to `resolver.assetExts`. Don't remove this — SQLite web worker fails to resolve `wa-sqlite.wasm` otherwise.
- **Port 8081 stuck**: `netstat -ano | grep :8081` → `taskkill //F //PID <pid>` (Windows bash).
- **Schema migration**: `app/src/lib/db/provider.tsx` uses `PRAGMA user_version` + `SCHEMA_VERSION` constant. Bump `SCHEMA_VERSION` and list tables to drop in the migration block whenever a table changes shape. Seed tables (users, formulas, grass_types, paddocks, herd) are **not** dropped to preserve fixtures.
- **Tiles do mapa são empacotados**: `app/assets/tiles/` contém ~2700 PNGs do OSM para o bbox da fazenda (zooms 12–17, ~55 MB). O bundle React Native (APK/IPA) contém todos — o mapa funciona offline a partir do primeiro boot. Para atualizar a base OSM (~1×/mês), rodar `cd app && node scripts/fetch-tiles.mjs` e commitar `assets/tiles/` + `src/components/map/tile-manifest.ts`. O script respeita rate-limit OSM (2 req/s), leva ~35 min. Quando o KML dos piquetes mudar (bbox diferente), roda-se o `fetch-tiles.mjs` também — tiles fora do novo bbox são apagados automaticamente.
- **Leaflet inline no WebView**: nativo não usa CDN para Leaflet. `scripts/bundle-leaflet-inline.mjs` copia `leaflet.css` + `leaflet.js` de node_modules para strings em `src/components/map/leaflet-inline.ts`, que são injetados no HTML do WebView. Regenerar se a versão do Leaflet mudar em package.json.

## Architecture

### Routing (expo-router, file-based)

```
app/src/app/
├── (auth)/login.tsx              Auth gate (first login online, cached after)
├── (tabs)/                       6 main tabs: index(Painel)/ronda/rebanho/estoque/mapa/relatorio
├── ronda/[paddockId]/
│   ├── menu.tsx                  Menu de Avaliação — uses <BottomNav/> for persistent nav
│   └── {supplement,bombona,forage,water,biological,health,fence,weight,washing}/
│       └── step1..N.tsx + summary.tsx
├── admin/                        Formulações, tipos de capim, lotação, mover rebanho
├── estoque/                      Entrada/saída
└── reabastecimento/              3-phase: carregar → rota → resumo
```

Wizards route sequentially (each `step` calls `router.push` to next). `summary.tsx` saves to SQLite and `router.replace`s to `/(tabs)/ronda` (a listagem de piquetes). **Don't** add `<BottomNav/>` inside wizard steps — it breaks flow integrity. Only main screens and the evaluation menu carry the bottom nav.

### State — Zustand (`app/src/stores/`)

- `authStore` — current user, login/logout
- `rondaStore` — wizard state per ronda section (supplement/bombona/forage/water/biologicalWater/health/fence/visualWeight/washing). Each section has its own slice + `updateX`/`resetX` actions. `resetAll` clears everything between rondas.
- `syncStore` — estado do daemon de sync (status, pending counts, last sync). Engine real em `app/src/lib/sync/engine.ts` + `daemon.ts`.

Wizard pattern: step1 calls `resetX()` in `useEffect`, each step calls `updateX({ field })`, summary reads slice and issues INSERT.

### DB (`app/src/lib/db/`)

- `schema.ts` — single `CREATE_TABLES_SQL` string with all `CREATE TABLE IF NOT EXISTS`
- `seed.ts` — single `SEED_SQL` string (users, grass types, formulas, etc.). Seed runs only when `users` table is empty.
- `provider.tsx` — `DatabaseProvider` React context + `useDatabase()` hook. Handles WAL mode, FK enforcement, schema versioning, seed bootstrap.

Each ronda section has its own `*_evals` table FK'd to `rondas.id` (`supplement_evals`, `bombona_evals`, `forage_evals`, `water_evals`, `biological_water_evals`, `health_evals`, `fence_evals`, `visual_weight_evals`, `washing_evals`). Menu screen queries each for the last `created_at` to show "Últ: DATA" per card.

### UI Components (`app/src/components/ui/`)

Reusable primitives — treat as the design system. Don't introduce new button/input styles; extend existing ones:

- `WizardFlow` — standard wizard container (header, step indicator, VOLTAR/AVANCAR)
- `BinaryChoice` — large SIM/NAO buttons
- `MultiChoice` — radio-list with description and optional icon
- `SliderInput` — numeric with min/max/step/unit
- `PhotoButton` — optional photo capture (never required)
- `ResultCard`, `SummaryRow`, `Badge`, `Card`, `Button` — layout helpers
- `BottomNav` — 6-tab persistent bar (use only on main screens + ronda menu)

## Domain

- **Piquete (Paddock)**: fenced pasture with grass type, area (ha), assigned herd
- **Ronda**: daily field inspection. Core workflow; the app is largely a UI over ronda wizards.
- **Bombona**: per-paddock supplement storage. **Separate from Suplementação** — each has its own item in the evaluation menu and its own eval table (`bombona_evals`).
- **Reabastecimento**: 3-phase tractor route — Load at sede → Distribute to bombonas → Return leftover
- **Lotação**: cab/ha (heads per hectare), per paddock and overall
- **Categorias de gado**: BEZERRO MAMANDO, BEZERRA MAMANDO, BEZERRO, BEZERRA, GARROTE, NOVILHA, NOVILHA PRENHA, BOI, VACA SOLTEIRA, VACA PRENHA, VACA PARIDA (11 categorias; definidas em `constants/index.ts CATTLE_CATEGORIES`, ordem por evolução etária). Lote de pares = VACA PARIDA + BEZERRO/A MAMANDO no mesmo piquete (`PAIR_CATEGORIES`).
- **Formulações**: supplement formulas (CRUD) — `kg_per_sack`, `target_consumption_g_per_day`
- **Tipos de Capim**: grass types (CRUD) with entry/exit height targets (cm)

### Key calculations (`app/src/constants/index.ts`)

- `calculateSupplementDays(sacks, kgPerSack, heads, gPerDay)` → dias até zerar o cocho
- `calculateStockingRate(heads, ha)` → cab/ha
- `calculateForageAverage(m1, m2, m3)` → média das 3 medidas de altura
- `classifyFence(volts)` → `FORTE` ≥4000 / `ADEQUADO` ≥2000 / `FRACO` ≥1 / `SEM CHOQUE` =0

### Ronda sections — current shape

Section order in `menu.tsx`: Suplementação → Bombona → Forragem → Aguada → Biológico → Sanidade → Cerca → Peso visual → Lavagem (9 seções).

- **Sanidade** stores **`affected_pct` (REAL, 0–100)**, not a count
- **Cerca** asks "evita mistura?" first, voltage second
- **Lavagem** is "did you just wash?" — if no, returns to menu without saving; if yes, 2 screens (photo optional + confirm)
- **Bombona** separate flow: has_stock? → formula → sacks → summary

## Design system — SOURCE OF TRUTH

**Todo elemento visual novo ou modificação existente DEVE seguir o NSA Design System em `nsa-design-system/project/`.** Antes de alterar qualquer tela, consultar:

- `nsa-design-system/project/colors_and_type.css` — tokens de cor/tipografia
- `nsa-design-system/project/pecuaria_redesign/atoms.jsx` — componentes (BrandHeader, Button, StatusPill, KPI, ChoiceCard, etc.)
- `nsa-design-system/project/pecuaria_redesign/screens_*.jsx` — telas de referência

Regras invioláveis:
- Tokens: `NSA.green800` (#172514) + `NSA.cream` (#FFFFE3) na brand, semantic via `NSA.ok/warn/danger/info`, paleta completa em `app/src/theme/nsa.ts`.
- Fonte: **Inter** (400/500/600/700) pro corpo, **Lora 600/700** pra números hero (KPIs) e títulos de BrandHeader. `Fonts.semibold` etc. em `theme/nsa.ts`. Nunca `fontWeight: '700'` direto.
- Icons: **lucide-react-native** (stroke 1.75). Proibido emoji em UI navegável.
- Primitivas: `BrandHeader`, `Button`, `Card`, `StatusPill`, `KPI`, `ProgressBar`, `MultiChoice`, `BinaryChoice`, `SliderInput`, `SummaryRow`, `WizardFlow`, `PhotoButton` em `app/src/components/ui/`. Não criar variantes locais — estender o primitivo se faltar.
- Helpers: `tokensForStatus(kind)` retorna `{edge, bg, fg, label}` pra qualquer estado semântico. Evite ternários `kind === 'danger' ? X : Y`.
- Copy: **Sentence case** ("Confirmar", não "CONFIRMAR"), separador `·` em vez de `•`, sem emoji em valor/label, motivos de morte/vendas em `herd_events.notes`/`weight_kg`.

Fallback rápido: `git reset --hard pre-redesign-v0.5.3`.

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
