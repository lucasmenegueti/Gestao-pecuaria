# CLAUDE.md

Guia pra Claude Code trabalhar neste repositório.

## Project Overview

**Gestão Pecuária NSA** — Offline-first mobile app pra gestão diária de pasto/gado na Fazenda NSA (~18,400 ha). PT-BR. Android + iOS + Web (dev).

Usado por peões em tratores/cavalos em piquetes remotos com conectividade ruim — **offline-first storage e targets grandes são hard constraints**.

## Imports

- @../nsa-design-system/CLAUDE-design.md — regras visuais NSA (aplica via `theme/nsa.ts` em RN)
- @docs/ARQUITETURA-E-DADOS.md — onde o dado vive (Supabase = fonte de verdade), como o sync funciona, toolchain de scripts, runbooks (adicionar piquetes / mexer no rebanho / migration). **Ler antes de mexer em dados, sync ou schema.**

## Repository Layout

- `app/` — Expo/React Native app (primary work)
- `prototipo/` — Historical HTML/CSS prototype (deployado em `gh-pages` pra UX research; ref only)
- `CHANGELOG.md` — **sempre atualizar** quando fizer mudança user-visible. Cada entry tem **Fallback** apontando pro tag anterior pra rollback.

## Dev Commands (de `app/`)

```bash
npm start                    # Metro interativo (QR pro Expo Go)
npm run web                  # http://localhost:8081
npm run android              # emulador ou USB
npm run ios                  # Mac only
npx expo start --tunnel      # fallback p/ LAN/firewall bloqueando Expo Go
```

Sem testes nem lint script configurados. Type check via `npx tsc --noEmit` em `app/`.

**`--tunnel` precisa de duas coisas.** O pacote: `npm install -g @expo/ngrok@^4.1.0` (sem ele o Expo pede confirmação interativa e morre em modo não-interativo). E o caminho: o npm instala em `/opt/homebrew/lib/node_modules`, que a resolução do Expo **não** varre — subir com `NODE_PATH=/opt/homebrew/lib/node_modules npx expo start --tunnel`. Sem o `NODE_PATH` o erro é idêntico ao de pacote ausente.

**Quando LAN não serve:** rede com isolamento de clientes (portal cativo de hotel/aeroporto, wifi corporativo). O Metro responde certo — `lsof -iTCP:8081` escutando, manifesto 200 pelo IP da LAN — e mesmo assim o device não chega. Diagnosticar pela rede, não pelo Metro; a saída é tunnel.

## Dev / Release Flow (obrigatório)

Toda alteração passa por 3 estágios, **nessa ordem**. Não pular — cada um pega classe diferente de bug.

1. **Local (Expo Go no Tab A9)** — `npx expo start --tunnel`, Tab A9 escaneia QR. **Pega:** JS/TSX, layout, lógica, rotas, sync, DB. **Não pega:** tiles empacotados, native modules novos, permissões nativas.
2. **APK preview (EAS Build)** — `eas build --profile preview --platform android --non-interactive --no-wait`. **Pega:** tiles, native modules, edge-to-edge, permissões. Ambiente igual ao de produção sem passar pelas lojas.
3. **Produção (Google Play + App Store)** — `eas build --profile production --platform all` + `eas submit`. Review Apple ~24h na primeira build.

**Regra de ouro:** não sobe pro estágio N+1 sem validação OK no N. Quebra no APK mas não no Expo Go → investigar antes de empurrar (comum ser diferença de runtime nativo).

### EAS Update vs EAS Build — quando usar cada

Mudanças de JS/TS/assets/JSON (incluindo `.env` que vira `process.env.EXPO_PUBLIC_*` inlined no bundle) podem ir via OTA: `eas env:update` + `eas update --branch <preview|production>`. Devices baixam na próxima abertura. Mudanças nativas (app.json `permissions`/`plugins`, novas dependências com código nativo, `runtimeVersion` bump) **exigem** `eas build`. Regra: se `npx expo prebuild` geraria `android/`/`ios/` diferentes, é build. Senão, é update.

## Known gotchas

- **`expo-sqlite` + Web**: requer `.wasm` como bundled asset. `app/metro.config.js` adiciona `wasm` a `resolver.assetExts`. Não remover — SQLite web worker falha em resolver `wa-sqlite.wasm`.
- **Port 8081 stuck**: `lsof -ti:8081 | xargs kill -9`.
- **`SliderInput` abre teclado**: o número grande é um `TextInput` editável ao toque. Varredura por `TextInput` **não** acha as telas que só usam slider (eram 17 de 31 na v0.7.17). Pra qualquer coisa de teclado/foco/scroll, buscar `TextInput\|SliderInput`.
- **`formulas.target_g_per_kg_body_day` é gramas por CABEÇA/dia** — o nome da coluna e o rótulo em `admin/formulas.tsx` ("g/kg PV/dia") mentem. O cadastro real da fazenda é por cabeça: 70 (Reprodução Ureia ADT), 100 (confinamento), 150 (Topmost NITRO) são valores normais. Fórmulas gravadas **abaixo de 1** (ex.: "Probeef Reprodução" = 0,25) são resquício da unidade antiga e não servem de régua — `paddock-info.ts` descarta `< 1`. **Nunca inferir a semântica desse campo pelo nome**; foi assim que uma sessão reportou um bug inexistente de "erro por 100×".
- **Schema migration**: `app/src/lib/db/provider.tsx` usa `PRAGMA user_version` + `SCHEMA_VERSION`. Bumpar `SCHEMA_VERSION` e listar tabelas a dropar no bloco de migration quando schema muda. Seed tables (users, formulas, grass_types, paddocks, herd) **não** são dropadas — preservam fixtures.
- **Sync de UPDATE: `SYNCED_TABLES` + `MUTABLE_TABLES` devem casar.** Se uma tabela está em `SYNCED_TABLES` como `appendOnly: false` (= recebe UPDATEs), **PRECISA** estar em `MUTABLE_TABLES` no mesmo arquivo. Sem isso, trigger `tg_<table>_mark_dirty` não é criado → UPDATEs locais não setam `pending_sync=1` → engine de push filtra por `pending_sync=1` e nunca envia → pull subsequente sobrescreve local com versão remota. Bug observado: rota finalizada nunca chegando no servidor.
- **Tiles do mapa empacotados**: `app/assets/tiles/` contém ~2700 PNGs do OSM pro bbox da fazenda (zooms 12–17, ~55 MB). Mapa funciona offline a partir do primeiro boot. Atualizar OSM: `cd app && node scripts/fetch-tiles.mjs` (respeita rate-limit OSM 2 req/s, ~35 min). Quando KML dos piquetes muda (bbox diferente), rodar `fetch-tiles.mjs` também — tiles fora do novo bbox são apagados automaticamente.
- **Leaflet inline no WebView**: nativo não usa CDN. `scripts/bundle-leaflet-inline.mjs` copia `leaflet.css` + `leaflet.js` de node_modules pra strings em `src/components/map/leaflet-inline.ts`. Regenerar se versão do Leaflet mudar em `package.json`.
- **Tiles no iOS via bridge, nunca `file://`**: WKWebView bloqueia `file://` em `loadHTMLString`. Tile vai por `postMessage`→`__deliverTile(base64)` (`map-html.ts`+`FarmMap.native.tsx`). Voltar pra `file://` = mapa verde no iPhone. PNG placeholder tem que ser RGBA(0,0,0,0) real (o antigo era verde 50%).
- **App passa por Cloudflare Worker proxy, não fala direto com Supabase**: `EXPO_PUBLIC_SUPABASE_URL` aponta pro Worker (free tier). Necessário porque certos IPs Cloudflare (`104.18.x.x`, `1.1.1.1`) têm TCP/443 silenciosamente dropado em devices em redes com CGNAT da operadora local. Outros IPs (`172.64.x.x`, `172.67.x.x`) funcionam normalmente. Worker faz passthrough preservando method/headers/body. Resolve pra IP estável `172.67.x.x` via backbone Cloudflare. Custo: +400-600ms por request, imperceptível. Trocar projeto Supabase: atualizar `TARGET_HOST` no Worker — não no app.

## Architecture

### Routing (expo-router, file-based)

```
app/src/app/
├── (auth)/login.tsx              Auth gate (first login online, cached after)
├── (tabs)/                       6 tabs: index(Painel)/ronda/rebanho/estoque/mapa/relatorio
├── ronda/[paddockId]/
│   ├── menu.tsx                  Menu de Avaliação — usa <BottomNav/>
│   └── {supplement,bombona,forage,water,biological,health,fence,weight,washing}/
│       └── step1..N.tsx + summary.tsx
├── admin/                        Formulações, tipos de capim, lotação, mover rebanho
├── estoque/                      Entrada/saída
└── reabastecimento/              3-phase: carregar → rota → resumo
```

Wizards routam sequencialmente. `summary.tsx` salva em SQLite e `router.replace`s. **Não** adicionar `<BottomNav/>` dentro de wizard steps — quebra integridade de fluxo. Só telas principais e menu de avaliação carregam bottom nav.

### State — Zustand (`app/src/stores/`)

- `authStore` — usuário, login/logout
- `rondaStore` — wizard state por ronda section. Cada section tem slice + `updateX`/`resetX`. `resetAll` limpa entre rondas.
- `syncStore` — estado do daemon de sync. Engine real em `app/src/lib/sync/engine.ts` + `daemon.ts`.

Pattern: step1 chama `resetX()` em `useEffect`, cada step chama `updateX({ field })`, summary lê slice e dá INSERT.

### DB (`app/src/lib/db/`)

- `schema.ts` — `CREATE_TABLES_SQL` único + `SEED_SQL`. Seed roda só quando `users` está vazia.
- `provider.tsx` — `DatabaseProvider` + `useDatabase()` hook. WAL mode, FK enforcement, versioning, seed bootstrap.

Cada ronda section tem `*_evals` table FK pra `rondas.id`. Menu screen busca cada uma pra mostrar "Últ: DATA" por card.

### UI Components (`app/src/components/ui/`)

Primitivos reusáveis = design system. Não introduzir novos estilos de botão/input — estender existentes: `WizardFlow`, `BinaryChoice`, `MultiChoice`, `SliderInput`, `PhotoButton`, `ResultCard`, `SummaryRow`, `Badge`, `Card`, `Button`, `BottomNav`.

## Domain

- **Piquete (Paddock)**: cercado com tipo de capim, área (ha), lote atribuído.
- **Ronda**: inspeção diária. Core workflow.
- **Bombona**: estoque de suplemento por piquete. **Separada de Suplementação** — cada uma tem seu item no menu e sua `*_evals` table.
- **Reabastecimento**: 3-phase tractor route (Load na sede → Distribute → Return leftover).
- **Lotação**: cab/ha por piquete.
- **Categorias de gado** (11 em `constants/index.ts CATTLE_CATEGORIES`, ordem etária): BEZERRO MAMANDO, BEZERRA MAMANDO, BEZERRO, BEZERRA, GARROTE, NOVILHA, NOVILHA PRENHA, BOI, VACA SOLTEIRA, VACA PRENHA, VACA PARIDA. Lote de pares = VACA PARIDA + BEZERRO/A MAMANDO (`PAIR_CATEGORIES`).
- **Formulações**: supplement formulas (CRUD) com `kg_per_sack` e alvo de consumo (ver gotcha da unidade acima).
- **Arroba (@) = 30 kg de PESO VIVO** — convenção da fazenda, definida pelo Lucas. Equivale a 15 kg de carcaça com 50% de rendimento; usar peso vivo direto evita carregar premissa de rendimento. Efeito prático: GMD em kg/dia é numericamente o ganho em @/mês.
- **Bezerro mamando não entra em conta de consumo por cabeça** (BEZERRO/BEZERRA MAMANDO): mama, não come do cocho. Dividir suplemento pelo total de cabeças subestima pela metade em lote de pares.
- **Tipos de Capim**: grass types com entry/exit height targets (cm).

### Key calculations (`app/src/constants/index.ts`)

- `calculateSupplementDays(sacks, kgPerSack, heads, gPerDay)` → dias até zerar o cocho
- `calculateStockingRate(heads, ha)` → cab/ha
- `calculateForageAverage(m1, m2, m3)` → média das 3 medidas de altura
- `classifyFenceWith(volts, settings.fence)` (em `lib/settings.ts`) → FORTE ≥4000 / ADEQUADO ≥2000 / FRACO ≥1 / SEM CHOQUE =0 — limites configuráveis via `app_settings`

### Ronda sections

Ordem em `menu.tsx`: Suplementação → Bombona → Forragem → Aguada → Biológico → Sanidade → Cerca → Peso visual → Lavagem.

- **Sanidade** armazena `affected_pct` (REAL, 0–100), não count.
- **Cerca** pergunta "evita mistura?" primeiro, voltagem depois.
- **Lavagem** = "lavou agora?" — não: volta sem salvar; sim: 2 screens (foto opcional + confirm).
- **Bombona**: has_stock? → formula → sacks → summary.

## UX Principles (hard rules — quebrar regride a experiência do peão)

- Min 56px touch target, 18px+ font, 1 decision por screen.
- Wizard pattern: VOLTAR/AVANCAR, step indicator sempre visível.
- Binary SIM/NAO: 100px+ tall, verde/vermelho.
- Fotos sempre opcionais, oferecidas por último.
- Color-coded por section (ver `Colors` em `constants/index.ts`).
- BottomNav só em main screens — nunca dentro de wizard step ativo.

## Conventions

- PT-BR pra strings user-facing.
- Número fracionário user-facing passa por `decimal()` (`constants/index.ts`) — vírgula, não ponto. Nunca interpolar `${n}` cru; o erro é silencioso e só aparece quando o valor deixa de ser inteiro.
- Wizard files: `step1.tsx` ... `stepN.tsx` + `summary.tsx` por pasta.
- Removendo step: manter filename original, só atualizar `step=` prop e `router.push` target (evita rename churn).
- Atualizar `CHANGELOG.md` + git tag pra mudança user-visible.

## Auth

Admin cria contas (sem self-registration). Primeiro login requer internet; credenciais cacheadas em SQLite. Seeded users locais (só SQLite, **não** existem no Supabase) pra dev. Admin de produção (Supabase Auth): username `lucas` — senha não commitada; pedir ao Lucas quando necessário.
