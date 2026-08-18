# Arquitetura & Fluxo de Dados — Gestão Pecuária NSA

Doc de referência pra entender **onde o dado vive, como chega no device, e como mexer nisso com segurança**. Escrito porque essas respostas estavam espalhadas por 6+ arquivos e custavam tempo. Complementa o `CLAUDE.md` (que é o índice + regras de processo).

> Convenção: quando este doc e o código divergirem, **o código é a verdade**. Aqui a gente explica o *porquê* não-óbvio e aponta o arquivo. Listas que mudam muito (ex.: quais tabelas sincronizam) ficam no código — aqui só a semântica.

---

## 1. A regra de ouro

**O dado vive no Supabase. O SQLite do app é um cache offline.**

- Fonte de verdade = Supabase Postgres, projeto **`fxtescythawmbwkthbyb`** (NSA-Gestao-Pecuaria, região sa-east-1).
- O **seed local está desativado** (`src/lib/db/provider.tsx` não roda seed; `src/lib/db/seed*.ts` ainda exportam SQL, mas ninguém executa — ver §4). Device novo nasce **vazio** e popula via `pullDelta` no primeiro login online.
- **Consequência prática:** pra adicionar/alterar catálogo (piquetes, formulações, tipos de capim, rebanho, caixas d'água), você escreve **no Supabase** — não num seed. Os devices puxam no próximo sync. **Não precisa rebuild nem OTA pra mudança de dados.**
- O app **não fala direto com o Supabase**: `EXPO_PUBLIC_SUPABASE_URL` aponta pra um **Cloudflare Worker** que faz passthrough. Necessário porque CGNAT da operadora local dropa certos IPs Cloudflare (ver `CLAUDE.md` › Known gotchas).

---

## 2. Como o sync funciona (`src/lib/sync/engine.ts` + `daemon.ts`)

### IDs: a ponte UUID ↔ INTEGER
- Supabase: PK é **`id` UUID**. Local: PK é **`id` INTEGER autoincrement**.
- A ponte é a coluna **`supabase_id`** (UUID) em cada tabela local + o cache **`IdMap`** (`table:uuid → localId`). No pull, FKs remotas (UUID) são resolvidas pra FKs locais (INTEGER) via `IdMap.localIdFor`.

### Pull (delta) — `pullDelta`
- Por tabela, em ordem de `SYNCED_TABLES`: `SELECT * WHERE updated_at > last_pull_at`, ordenado por `updated_at`.
- Upsert local: existe via `supabase_id`? → `UPDATE`; senão → `INSERT` (gera id local novo).
- **Ordem importa**: `grass_types` antes de `paddocks` (FK), `paddocks` antes de `herd`/`inventory`, `rondas` antes dos `*_evals`. FKs ficam **desligadas** (`PRAGMA foreign_keys=OFF`) durante o pull.
- Avança `last_pull_at` só se algo novo chegou **e** não houve exceção (evita pular linha que falhou).

### Push — `pushPending`
- `SELECT ... WHERE pending_sync=1`. `appendOnly:false` tenta `UPDATE` (se já tem `supabase_id`) senão `INSERT`. `appendOnly:true` faz `upsert(onConflict:'id')` com um **UUID estável gerado no device** (gravado em `supabase_id` *antes* do envio) — idempotente: retry de resposta-perdida ou ciclo concorrente re-envia o mesmo `id` e colapsa no mesmo row, em vez de cunhar UUID novo. **(v0.7.14; era `INSERT` puro com UUID server-side — origem das rondas/evals duplicadas.)**
- `toRemotePayload` remove `LOCAL_ONLY_COLS` e converte tipos.

### Marcação de "sujo" (dirty) — a regra que mais quebra
- Triggers `tg_<tabela>_mark_dirty` setam `pending_sync=1` em `UPDATE` — **só pra tabelas listadas em `MUTABLE_TABLES`** (`schema.ts`).
- **Regra de ouro:** toda tabela em `SYNCED_TABLES` com `appendOnly:false` **precisa** estar em `MUTABLE_TABLES`. Faltar = `UPDATE` local nunca seta `pending_sync` → nunca sobe → pull seguinte sobrescreve o local. (Bug histórico: rota de reabastecimento finalizada que não chegava no servidor.)

### `sync_rev` — anti-loop
- Marker que impede o ciclo push→pull→dirty→push. Escrita vinda do sync **incrementa `sync_rev`**; o trigger só dispara `WHEN NEW.sync_rev = OLD.sync_rev`. Ou seja: escrita de sync não re-marca dirty; só escrita do usuário marca.

### Dois timestamps distintos (de propósito)
- **`last_pull_at`** = cursor do delta. Avança só quando vem row nova. `NULL` = repull tudo.
- **`last_sync_at`** = timestamp de UI ("última sincronização"). Avança em todo ciclo bem-sucedido, mesmo sem novidade.

### Colunas que não atravessam
- **`LOCAL_ONLY_COLS`** (`id, supabase_id, local_updated_at, pending_sync, sync_rev, weight_kg`) nunca sobem. `weight_kg` em `herd_events` é local-only **porque o Supabase ainda não tem a coluna** — se subir, o INSERT remoto quebra.
- **`REMOTE_ONLY_COLS`** (`id, client_id, created_by, created_at, updated_at, deleted_at`) são ignoradas ao inserir localmente.
- **`geometry`**: `TEXT` (JSON string) no local ↔ `jsonb` no Supabase. Conversão em `toLocalValue`/`toRemotePayload`.

### Resolução de conflito
- **`tryHealOrphan`**: `INSERT` que bate `UNIQUE` no servidor → **deleta a órfã local + reseta `last_pull_at`** (próximo pull baixa a versão canônica). **Não soma** — foi o fix do "gado fantasma" (v0.7.10, contagem dobrava).
- **Circuit breaker**: 3 falhas de push numa row (ex.: RLS) → ela vira "deferred" até o próximo boot (não retenta a cada 15s).

### Tabelas que NÃO sincronizam
- **`users`** = cache local de profiles do Supabase **Auth** (preenchido no fluxo de auth, não pelo engine).
- **`activity_log`** = log local-only, janela rolante de 1000 entradas.
- **`sync_state`** = metadados do cursor de sync (1 row).

---

## 3. Mapa de tabelas (local × Supabase)

A **lista canônica** está em `src/lib/db/schema.ts` (`SYNCED_TABLES`). A forma de cada tabela sincronizada:

| Aspecto | Local (SQLite) | Supabase (Postgres) |
|---|---|---|
| PK | `id` INTEGER autoincrement | `id` UUID (`gen_random_uuid()`) |
| Ponte | `supabase_id` TEXT UNIQUE | — |
| Timestamps | `local_updated_at` | `created_at`, `updated_at` |
| Soft-delete | `deleted_at` | `deleted_at` |
| Sync flags | `pending_sync`, `sync_rev` | — |
| Multi-tenant | — | `client_id`, `created_by` (hoje **NULL** em tudo) |
| Geometria | `geometry` TEXT (JSON) | `geometry` jsonb |
| Booleans | 0/1 | boolean |

**Categorias de tabela** (atributo `appendOnly` em `SYNCED_TABLES`):
- **Catálogo / mutável** (`appendOnly:false`, geram trigger dirty): `grass_types`, `formulas`, `paddocks`, `water_tanks`, `farm_boundaries`, `herd`, `inventory`, `resupply_routes`, `resupply_loads`, `app_settings`.
- **Ledger / append-only** (`appendOnly:true`, upsert idempotente on `id`): `rondas`, todos os `*_evals`, `herd_events`, `inventory_events`, `resupply_deliveries`.
- **Local-only** (não em `SYNCED_TABLES`): `users`, `activity_log`, `sync_state`.

> `grass_type_id` em `paddocks` é **obrigatório** no local (`NOT NULL`) e a tela do mapa faz **INNER JOIN** em `grass_types` — piquete sem tipo de capim **não aparece**. Currais de confinamento usam o tipo **"Confinamento"** (alturas 0/0).

> **`inventory.quantity_sacks` é derivado do ledger NO SERVIDOR** (migration `inventory_balance_derived_from_ledger`, 2026-06-01). Dois triggers no Supabase mantêm `quantity_sacks = SUM(inventory_events.sacks_delta)` por `(formula_id, paddock_id)`: `inventory_force_ledger` (BEFORE UPDATE — ignora qualquer saldo "cru" pushado, força o do ledger) e `inventory_events_recompute` (AFTER INSERT em `inventory_events` — recalcula). Motivo: peões davam baixa de estoque que ficava presa em `pending_sync` e o saldo do servidor derivava (divergência do Topmost NITRO: peão via 70, admin via 80). Agora a ordem de sync é irrelevante — o ledger é a verdade. **Consequência:** não dá pra setar saldo direto no servidor; toda mudança tem que ser um evento (entrada/ajuste/rota já são). O baseline limpo veio de eventos `SALDO_INICIAL` (contagem física) — sem ele os triggers seriam destrutivos (vários ledgers eram negativos por ajustes-delta sobre saldos sem ENTRADA). O **SQLite local não mudou** (offline-first: computa/exibe saldo local; no pull recebe o derivado). Pré-requisito disso: a policy RLS `inventory_upd`/`herd_upd` foi aberta de `is_admin() OR created_by=auth.uid()` (efetivamente admin-only, pois `created_by` é sempre NULL) para `auth.role()='authenticated'` — senão o UPDATE do peão nunca subia.

> **A bombona não é debitada pelo consumo — o "quanto tem hoje" é calculado em leitura** (`src/lib/bombona.ts`, v0.7.16). `inventory` com `location='bombona'` guarda o que a **rota entregou**; a ronda de Suplementação registra os sacos que vão pro cocho, mas esses sacos saem da bombona e **nenhum evento os debita**. Por isso os saldos ficavam parados na data da última entrega. A conta que fecha a lacuna:
>
> ```
> deveria ter = inventory.quantity_sacks − Σ supplement_evals.sacks_in_trough
>               (das rondas do piquete, mesma fórmula, restocked=1, r.date > last_resupply_date)
> ```
>
> `loadBombonaExpectations()` é a **fonte única** dessa conta — a ronda de Bombona e o alerta do Painel (`alerts.ts`) leem de lá. O alerta usa o resultado como "quanto ainda tem" e só o consumo do rebanho para "quanto dura"; antes ele derivava o saldo por conta própria e podia discordar da ronda sobre o mesmo piquete.
>
> **Não confundir com o "não recomputar saldo pelo ledger" da reconciliação de 06/2026** (nota acima): aquilo era sobre reescrever o saldo **gravado** da central a partir de um ledger incompleto. Aqui nada é reescrito na leitura — o saldo gravado só muda quando o peão confirma ou corrige.
>
> **A confirmação da ronda corrige o estoque.** Discordância (ou "bombona vazia", que zera todas as fórmulas daquele piquete) grava `inventory_events` do tipo `CONTAGEM_BOMBONA` com a diferença e re-ancora `last_resupply_date` para hoje, na mesma transação da avaliação. O evento é obrigatório porque o trigger `inventory_force_ledger` ignora saldo cru pushado. Re-ancorar é o que impede o número de errar de novo no dia seguinte — sem isso a próxima leitura tornaria a descontar os abastecimentos antigos do saldo recém-corrigido. Quando a contagem bate (delta 0) a âncora **não** se move, de propósito. Limite conhecido: a âncora é `DATE`, então abastecimento feito depois de uma contagem divergente no mesmo dia fica de fora (erra pra cima; a ronda seguinte corrige).

---

## 4. Toolchain de scripts — quem gera o quê

O ponto que mais confunde: vários arquivos parecem "mortos" pro runtime mas são **build-time**. Cadeia:

```
kml/*.kmz ──kml-to-seed.mjs──▶ src/lib/db/seed-map.ts   (GERADO — não editar à mão)
                                       │
            ┌──────────────────────────┼───────────────────────────┐
            ▼                          ▼                            ▼
   fetch-tiles.mjs            generate-supabase-seed.mjs    (lido p/ bbox)
   → assets/tiles/*.png        → SQL p/ popular Supabase
   (mapa offline; bbox)

node_modules/leaflet ──bundle-leaflet-inline.mjs──▶ src/components/map/leaflet-inline.ts
```

- **`seed-map.ts` NÃO é lido em runtime** (o provider não semeia). É consumido em **build-time** por `fetch-tiles.mjs` (calcula o bbox dos tiles empacotados) e por `generate-supabase-seed.mjs`. Por isso **parece órfão, mas não é** — não delete.
- ⚠️ **Cruft conhecido:** `kml-to-seed.mjs` e `fetch-tiles.mjs` têm caminho default **Windows** (`C:/Users/lucas/gestao-pecuaria/kml`). No Mac, passe o arquivo como argumento (`node scripts/kml-to-seed.mjs caminho.kml`).
- ⚠️ **Staleness atual:** `seed-map.ts` tem **145** piquetes; o Supabase tem **203** (o confinamento CF1–CF26 e os 32 `NSA2 - Pxx` foram inseridos direto no Supabase; CF21–CF26 estão **sem geometria** por falta de KML). Isso **não afeta o app** (ele puxa os 203 do Supabase). Só importa pra: (a) bbox de tiles, (b) re-seed. Os CF caem **dentro** do bbox atual (lng −45.34..−45.45 / lat −15.18..−15.30), então os tiles offline já cobrem. Só regenere `seed-map.ts` + `fetch-tiles.mjs` se adicionar piquete **fora** desse range.

**Scripts de ops/auditoria — INTENCIONAIS (manter):** `audit-herd.mjs`, `history-herd.mjs`, `probe-paddock.mjs`, `fix-p19a-ghost.mjs`, `xlsx-to-herd.mjs`, `generate-supabase-seed.mjs` (vários citados no `CHANGELOG.md` como referência de post-mortem).

**Scripts `test-*.mjs`** = diagnósticos one-off (latência de login/sync, repro de bug). Descartáveis. ⚠️ Três contêm **senha hardcoded** — ver §6.

---

## 5. Runbooks

### Adicionar piquetes
1. Geometria via KML (polígono por piquete). **Opcional — ver nota abaixo.**
2. `INSERT` no Supabase `paddocks`: `name`, `area_hectares`, `grass_type_id` (**obrigatório**; confinamento → tipo "Confinamento"), `center_lat`/`center_lng`, `geometry` jsonb GeoJSON com coords **`[lon, lat]`**, `active=true`, `client_id`/`created_by` **NULL** (igual aos existentes).
3. Devices puxam no próximo sync. **Sem rebuild.**
4. **Tiles:** se o piquete cair **fora** do bbox atual (§4), regenere `seed-map.ts` + `fetch-tiles.mjs` e suba **APK novo** (tiles são empacotados, não sincronizam).

> **Sem KML? Cria assim mesmo.** `geometry` e `center_lat`/`center_lng` são nullable e **só a tela do Mapa** os consome — `src/app/(tabs)/mapa.tsx` filtra `WHERE p.active = 1 AND p.geometry IS NOT NULL`. Rebanho, Ronda, Alocar/Mover gado, Estoque e Reabastecimento só exigem `grass_type_id`. Ou seja: piquete sem geometria é **plenamente operável** (dá pra mover gado, rodar ronda, dar baixa de estoque) — só não desenha no mapa. Quando o KML chegar, é um `UPDATE paddocks SET geometry=…, center_lat=…, center_lng=…` e o polígono aparece no sync seguinte, **sem rebuild nem OTA** (desde que caia no bbox dos tiles — §4). Cuidado com `area_hectares`: é `NOT NULL` e entra no cálculo de lotação (cab/ha), então área estimada = lotação estimada.

> **Área quando o KML traz o polígono mas não a área.** Não precisa estimar — derive do próprio polígono por **shoelace em projeção equirretangular local** (`x = lon·(π/180)·R·cos(latRef)`, `y = lat·(π/180)·R`, `R = 6378137`, `latRef` = latitude média do polígono). Nessa latitude o erro é irrelevante e dispensa PostGIS (a coluna `geometry` é `jsonb`, não `geography` — não dá pra usar `ST_Area`). Confira o resultado contra piquetes vizinhos antes de gravar: os 32 `NSA2` deram média 23,8 ha, batendo com os P77–P84 ao lado. Só caia pra área presumida quando **não houver polígono** (foi o caso de CF21–CF26).

> **Antes de rodar `fetch-tiles.mjs` (35 min), teste se os tiles já cobrem.** O bbox empacotado é o de `seed-map.ts` **+ 0.002° de pad** (~200 m) — e como `seed-map.ts` fica desatualizado (acima), comparar bbox contra bbox engana. Enumere os tiles do novo bbox com a mesma tile math do script (`lon2x`/`lat2y`, z12–z17) e teste `fs.existsSync` em `app/assets/tiles/<z>_<x>_<y>.jpg`. Se faltar zero, o mapa offline já cobre a área e **não precisa regerar tiles nem subir APK**. Foi assim que os 32 `NSA2` entraram sem build (286 tiles, 0 faltando).
- **Rollback:** soft-delete — `UPDATE paddocks SET deleted_at=now(), updated_at=now() WHERE ...` (sincroniza).

### Mexer no rebanho (`herd`)
- Forma: `(paddock_id, category, head_count, avg_weight_kg)`. **Pool** = `paddock_id IS NULL`. `UNIQUE (paddock_id, category)` quando alocado; `UNIQUE (category)` no pool.
- Movimentos sempre via **`herd_events`** (ledger append-only). Invariante: `herd.head_count` == soma dos `herd_events` daquela (piquete, categoria).
- **Não** crie a mesma row `(piquete, categoria)` em 2 devices offline → `tryHealOrphan` descarta a órfã (não soma).
- Auditar: `node scripts/audit-herd.mjs <user> <pass>` / `scripts/probe-paddock.mjs`.

### Alterar schema (migration)
- **Local:** bump `SCHEMA_VERSION` em `provider.tsx` + bloco `if (currentVersion < N) { DROP TABLE ... }` listando as tabelas cuja forma mudou. Seed tables não precisam drop se a mudança for **aditiva** (`ALTER TABLE ADD COLUMN` — SQLite só permite aditivo).
- **Remoto:** migration `.sql` aplicada no Supabase (MCP `apply_migration` ou SQL editor). **Local e remoto são independentes** — `SCHEMA_VERSION` é `PRAGMA user_version`, não sincroniza.
- **Nova tabela sincronizada:** (1) `CREATE TABLE` em `schema.ts` com o bloco de colunas SYNC; (2) adicione a `SYNCED_TABLES` com `appendOnly` e `fkCols` na ordem certa; (3) se `appendOnly:false`, adicione também a `MUTABLE_TABLES` (senão UPDATEs não sobem).

### Forçar repull total
- `UPDATE sync_state SET last_pull_at = NULL WHERE id = 1;` → próximo `pullDelta` traz tudo.

---

## 6. Segurança (atenção)

- A **anon key** + URL do Supabase são públicas por design (ficam no binário; o RLS protege). OK.
- ⚠️ **Senha de usuário hardcoded e versionada:** `scripts/test-reauth-recovery.mjs`, `test-push-batch.mjs` e `test-routes-state.mjs` contêm a senha do usuário `lucas` em texto puro, **commitada no histórico git**. Deletar o arquivo não remove do histórico. **Rotacionar a senha** no Supabase e nunca hardcodar credencial (usar `<user> <pass>` por argumento, como os scripts de ops fazem).

---

## 7. Onde olhar primeiro (índice de arquivos)

| Pergunta | Arquivo |
|---|---|
| Tabelas, triggers, `SYNCED_TABLES`/`MUTABLE_TABLES` | `src/lib/db/schema.ts` |
| Migrations, seed (desativado), boot do DB | `src/lib/db/provider.tsx` |
| Pull/push, IdMap, heal, circuit breaker | `src/lib/sync/engine.ts` + `daemon.ts` |
| Estado do daemon de sync | `src/stores/syncStore.ts` |
| Mapa, geometria, tiles offline | `src/components/map/`, `src/app/(tabs)/mapa.tsx` |
| Cálculos (consumo, lotação, forragem, cerca) | `src/constants/index.ts`, `src/lib/settings.ts` |
| Toolchain de assets | `scripts/kml-to-seed.mjs`, `fetch-tiles.mjs`, `bundle-leaflet-inline.mjs` |
