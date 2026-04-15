# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gestao Pecuaria NSA** — Offline-first mobile app for daily pasture and cattle management at Fazenda Nossa Senhora Aparecida (Chapada Gaucha / Januaria-MG, ~18,400 hectares). PT-BR only. Android + iOS.

The app is used by field workers ("peoes") who ride tractors/horses through remote pastures with poor connectivity, so offline-first and large touch targets are critical.

## Current State

The project is in **prototype phase**. The `prototipo/` folder contains a navigable HTML/CSS prototype (48 files) deployed to GitHub Pages for UX validation. The Expo/React Native app has not been started yet.

### Branches
- `claude/nsa-livestock-app-VSLd2` — main development branch
- `gh-pages` — static HTML prototype for GitHub Pages (copy files from `prototipo/` to deploy)

### Deploying prototype to GitHub Pages
```bash
git checkout gh-pages
git checkout claude/nsa-livestock-app-VSLd2 -- prototipo/
git commit -m "deploy: update gh-pages"
git push -u origin gh-pages
git checkout claude/nsa-livestock-app-VSLd2
```

## Target Stack (for Expo app, not yet created)

- **Expo SDK 52** (52.0.49), expo-router 4.0.22
- **NativeWind 4.2.3** + tailwindcss >3.3.0
- **expo-sqlite** for offline-first local DB
- **Zustand 5.x** for state management
- **Supabase** for backend sync (placeholder for now)
- **TypeScript strict mode**

## Domain Concepts

- **Piquete (Paddock)**: Fenced pasture area with a grass type, area in hectares, and assigned herd
- **Ronda (Round)**: Daily field inspection of paddocks — the core workflow. Each ronda evaluates multiple aspects via wizard-style flows:
  - **Suplementacao**: Trough score, restocking, formula selection, days forecast
  - **Forragem**: 3 grass height measurements, average vs. ideal targets per grass type
  - **Aguada**: Water availability and quality (EXCELENTE/BOA/MEDIANA/RUIM)
  - **Lavagem de Bebedouro**: Trough washing status and condition
  - **Sanidade**: Parasite check, affected count
  - **Cerca**: Voltage reading, classification (FORTE/ADEQUADO/FRACO/SEM CHOQUE)
  - **Peso Visual**: Estimated weight by animal category
- **Bombona**: Per-paddock supplement storage (secondary stock). Central warehouse at sede (primary stock)
- **Reabastecimento**: 3-phase tractor route — Load at sede → Distribute to bombonas → Return leftover
- **Lotacao (Stocking Rate)**: cab/ha (heads per hectare), tracked per paddock and overall
- **Categorias de gado**: BEZERRO MAMANDO, BEZERRA MAMANDO, BEZERRO, GARROTE, BOI, BEZERRA, NOVILHA, VACA
- **Formulacoes**: Supplement formulas (CRUD) with kg_per_sack and target_consumption_g_per_day
- **Tipos de Capim**: Grass types (CRUD) with entry/exit height targets in cm

## UX Principles

- **Peao-friendly**: Min 56px button height, 18px+ font, 1 decision per screen
- **Wizard pattern**: Multi-step flows with VOLTAR/AVANCAR navigation, step indicator
- **Binary choices**: Large SIM/NAO buttons (green/red, 100px+ tall)
- **Photos optional**: Never required, always offered as last step
- **Color coding**: Green=ok, Yellow=warning, Red=danger throughout. Each ronda type has its own accent color

## Key Calculations

- **Dias de suplemento** = (sacos × kg_por_saco) / (animais × consumo_g_dia / 1000)
- **Lotacao** = cabecas / hectares
- **Media forragem** = average of 3 height measurements, compared against grass_type entry/exit targets

## Prototype File Naming

HTML files follow the pattern `NN-name-step.html`:
- `01` Login, `02` Dashboard, `03` Paddock selection, `04` Evaluation menu
- `05-*` Suplementacao (8 steps), `06-*` Forragem (6 steps), `07-*` Aguada (3 steps)
- `08-*` Sanidade (4 steps), `09-*` Cerca (3 steps), `10-*` Peso Visual (3 steps)
- `11` Mapa, `12` Rebanho, `13` Estoque (central + bombonas), `14-*` Reabastecimento (4 phases)
- `15` Lotacao, `16` Admin Formulacoes, `17` Admin Tipos de Capim, `18-*` Lavagem Bebedouro (4 steps)

## Planned App Architecture

```
app/(auth)/login.tsx          — Auth (first login requires internet)
app/(tabs)/                   — 5 tabs: Dashboard, Ronda, Rebanho, Estoque, Mapa
app/ronda/[paddockId]/        — Evaluation menu + wizard screens per paddock
app/admin/                    — Formulacoes and Tipos de Capim CRUD
components/ui/                — Reusable: Button, Card, SliderInput, BinaryChoice, MultiChoice, WizardFlow, etc.
lib/db/                       — SQLite schema, migrations, queries, seed, provider
stores/                       — Zustand: authStore, rondaStore, syncStore
hooks/                        — useAuth, usePaddocks, useRonda, useHerd, useInventory, useFormulas, useGrassTypes
types/                        — All TypeScript interfaces
constants/                    — Colors, categories, seed formulas
```

Auth: Admin creates accounts, no self-registration. Credentials cached in SQLite after first online login.
