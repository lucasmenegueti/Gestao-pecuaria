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
- **O UUID é reivindicado no banco, não no snapshot** (`UPDATE … WHERE supabase_id IS NULL` + releitura, v0.13.1). O mutex do daemon **não** garante ciclo único: o watchdog solta a trava de um ciclo com mais de 60 s que continua vivo (um request ruim leva até 51,5 s), e no web cada aba tem o seu daemon. Sem o claim, cada ciclo cunhava o seu UUID → evento em par no servidor. Modelo da corrida: `scripts/test-sync-race.mjs`.
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
- **Coluna que o device não conhece é descartada no pull.** `localInsertFromRemote`/`localUpdateFromRemote` filtram as chaves do row remoto pelas colunas que a tabela local tem de fato (`localColumns`, cache de `PRAGMA table_info`). Sem isso, servidor uma migration à frente fazia o INSERT local estourar, o `catch` engolir e `last_pull_at` avançar — o row sumia em silêncio naquele aparelho.

### `created_at` das avaliações é o relógio do DEVICE, não do servidor

Vale pra `*_evals` e qualquer tabela cujo `CREATE TABLE` local tenha `created_at TEXT DEFAULT (datetime('now','localtime'))`. A coluna **não** está em `LOCAL_ONLY_COLS`, então sobe crua e cai num `timestamptz` — chega ao Postgres como **hora de Brasília rotulada de UTC**. Consequências:

- `created_at` (lido como naive) = a hora que o peão viu no relógio ao salvar a tela. É o dado mais fiel de *quando* a avaliação foi feita.
- `updated_at` = `now()` do servidor no push. Então **`updated_at − created_at − 3h` = quanto tempo o registro ficou no aparelho antes de sincronizar** (proxy de tempo sem sinal). O piso é 3h exatas; valor diferente disso é relógio do device errado.
- `rondas` **não** tem `created_at` local, só `date`. Pra hora de uma ronda, use o `min(created_at)` das avaliações dela.

Não "corrija" o offset com `at time zone` sem checar: o valor gravado não é UTC de verdade.

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

> **A bombona é debitada na hora pela Suplementação** (desde v0.11.0): salvar a avaliação com `restocked=1` grava um `inventory_events` tipo `CONSUMO_COCHO` (−sacos) e desce `quantity_sacks`, na mesma transação. **Todo fluxo que escreve saldo de bombona passa antes por `settleBombona()`** (`src/lib/bombona.ts`) — liquida o consumo pendente como evento, desce o saldo pro real e move a âncora `last_resupply_date` pra hoje. **Nunca escrever `inventory` de bombona sem settle**: foi exatamente isso (a rota somando entrega sobre o saldo bruto e re-ancorando) que inflava a contagem a cada ciclo de reabastecimento — bug da v0.11.0, ver `CHANGELOG.md`.
>
> `loadBombonaExpectations()` continua sendo a **fonte única** do "quanto tem hoje" — ronda de Bombona, alerta do Painel e tela da rota leem de lá:
>
> ```
> deveria ter = inventory.quantity_sacks − Σ supplement_evals.sacks_in_trough
>               (das rondas do piquete, mesma fórmula, restocked=1, r.date > last_resupply_date)
> ```
>
> Com o débito na hora, `used` tende a 0 e a conta vira ponte de transição: pega avaliações de devices em versão antiga (que não debitam) e ordena o dia — avaliação com `r.date` igual à âncora já está embutida no saldo e o `>` estrito impede débito em dobro. Por isso o settle **sempre** move a âncora pra hoje antes de a Suplementação inserir a avaliação do dia.
>
> **Não confundir com o "não recomputar saldo pelo ledger" da reconciliação de 06/2026** (nota acima): aquilo era sobre reescrever o saldo **gravado** da central a partir de um ledger incompleto. O settle materializa só o consumo desde a âncora — saldos inflados por ciclos **anteriores** à v0.11.0 não se recuperam da conta; só uma contagem física (ronda de Bombona) corrige.
>
> **A confirmação da ronda corrige o estoque.** Discordância (ou "bombona vazia", que zera todas as fórmulas daquele piquete) grava `inventory_events` do tipo `CONTAGEM_BOMBONA` com a diferença e re-ancora `last_resupply_date` para hoje, na mesma transação da avaliação. O evento é obrigatório porque o trigger `inventory_force_ledger` ignora saldo cru pushado. Quando a contagem bate (delta 0) a âncora **não** se move, de propósito.

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
- Movimentos sempre via **`herd_events`** (ledger append-only). A intenção é que `herd.head_count` == soma dos `herd_events` daquela (piquete, categoria) — mas **isso não vale na prática, e código novo não pode assumir que vale.**

> **O ledger fica negativo.** Quando a mesma saída é lançada duas vezes (P47, maio/2026: 5 vacas paridas desalocadas *e* transferidas), o saldo acumulado da categoria vai abaixo de zero e nunca se recupera. Somando o piquete inteiro a divergência é grosseira: no P47 o ledger dá 32 cabeças contra 13 em `herd`.
>
> Duas consequências para quem for derivar algo do ledger:
> - **Trave o saldo em zero** ao acumular (`Math.max(0, saldo + delta)`). Piquete não guarda gado negativo, e sem a trava um saldo negativo antigo engole coortes legítimas posteriores.
> - **Acumule por categoria, não pelo total do piquete.** Por categoria o ledger reconcilia com `herd` mesmo onde o total diverge — foi assim que a entrada do lote da Ficha do Piquete (`src/lib/paddock-info.ts`) fechou exato nos quatro piquetes testados.
>
> `EVOLUCAO` também não é entrada nem saída: é troca de categoria no mesmo piquete, com a origem em `category` e o destino em `notes` ("ORIGEM → DESTINO"). Quem rastreia coorte precisa herdar a data através dela, senão um lote de 82 dias aparece como recém-chegado só porque virou boi.
- **Não** crie a mesma row `(piquete, categoria)` em 2 devices offline → `tryHealOrphan` descarta a órfã (não soma).
- Auditar: `node scripts/audit-herd.mjs <user> <pass>` / `scripts/probe-paddock.mjs`.

### Alterar schema (migration)
- **Local:** bump `SCHEMA_VERSION` em `provider.tsx` + bloco `if (currentVersion < N) { DROP TABLE ... }` listando as tabelas cuja forma mudou. Seed tables não precisam drop se a mudança for **aditiva** (`ALTER TABLE ADD COLUMN` — SQLite só permite aditivo).
- **Remoto:** migration `.sql` aplicada no Supabase (MCP `apply_migration` ou SQL editor). **Local e remoto são independentes** — `SCHEMA_VERSION` é `PRAGMA user_version`, não sincroniza.
- **Nova tabela sincronizada:** (1) `CREATE TABLE` em `schema.ts` com o bloco de colunas SYNC; (2) adicione a `SYNCED_TABLES` com `appendOnly` e `fkCols` na ordem certa; (3) se `appendOnly:false`, adicione também a `MUTABLE_TABLES` (senão UPDATEs não sobem).
- **Coluna nova em `appendOnly:true`** (sem trigger de dirty) só sobe se quem escreve setar `pending_sync = 1` na mão. O upsert por UUID estável cuida do resto — re-envio colapsa no mesmo row. Ver `src/lib/ronda-location.ts`.

> **Ordem OTA × migration: olhe a DIREÇÃO da coluna.**
>
> - **Coluna que DESCE** (o servidor passa a mandar algo novo no pull): **OTA primeiro**, confirmar que os aparelhos reabriram o app **duas vezes** (`expo-updates` baixa numa abertura e aplica na seguinte), migration depois. Migration antes = o pull estoura no device antigo e o row **some em silêncio** ali, com remédio manual por aparelho (`last_pull_at = NULL`).
> - **Coluna que SOBE** (o app passa a mandar algo novo no push): o servidor teria de estar pronto primeiro — mas isso conflita com a regra acima, porque toda coluna que sobe também desce no pull seguinte. **Na prática: OTA primeiro também.** O pior caso vira push falhando com `PGRST204` e entrando no circuit breaker — a row fica local com `pending_sync=1` e sobe sozinha depois da migration. Degradação visível e sem perda, melhor que perda silenciosa. Para encurtar a janela, faça como a v0.13.0: no push, não mande a coluna quando ela estiver vazia.
> - O filtro de coluna desconhecida do pull (§2) **não** salva o deploy que o introduz — ele só existe em device já atualizado. Protege a migration seguinte.
> - **Republicar a web junto** (ver `CLAUDE.md` › Web): ela roda o mesmo SQLite local e sofre o mesmo descasamento.

### Auditar se a ronda foi lançada no piquete

`app/scripts/auditoria-rondas.sql` (3 blocos, comentados). Desde a v0.13.0 `rondas` guarda `gps_lat/lng/accuracy_m/mocked/at`, capturados ao abrir o menu de avaliação — um ponto por ronda, tudo nullable (permissão negada ou GPS frio não podem travar o peão).

Antes disso, e como reforço depois, a leitura vem do `created_at` (seção acima) cruzado com `center_lat/center_lng`: distância entre piquetes consecutivos na ordem de gravação ÷ tempo = velocidade que o trajeto exigiria.

Duas armadilhas ao ler esses números:
- **Currais de confinamento (`CF%`) ficam todos na sede.** Distância entre eles não diz nada sobre presença — "no escritório" e "no curral" são o mesmo ponto. Só piquetes de pasto entram no teste geográfico.
- **A ordem alfabética da lista não acusa nada.** `(tabs)/ronda.tsx` ordena por `p.name`, e o peão segue a tela também nos dias legítimos. O que discrimina é a velocidade exigida, não a ordem.

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
