# Briefing — duplicação de rondas no sync (gestão-pecuária)

> Achado durante a investigação do **Relatório Diário da Pecuária** (repo
> `gestao-pecuaria-dashboard`). A causa-raiz está **aqui, no app de origem**: o
> sync está gravando **linhas de ronda duplicadas e vazias** no Supabase. O
> relatório já foi blindado pra ignorá-las, mas a origem precisa ser corrigida —
> o dashboard e o app ainda mostram os números inflados.

## Sintoma

- Um talhão aparece com **"4 rondas"** num único dia quando houve **1 visita só**.
- Talhões aparecem **rondados (verdes no mapa)** sem nenhuma avaliação registrada.
- Contagem de rondas/talhões muito acima do real.

## Evidência forense — P57 em 2026-06-08

A tabela `rondas` tem **4 linhas** pro P57 no dia, todas do mesmo peão
(`user_id 2a12a4cf-…`), criadas em **148 ms**:

| id (UUID) | created_at | completed | local_updated_at | pending_sync |
|---|---|---|---|---|
| ea47f9c9-… | 18:07:49.265840Z | false | **null** | **null** |
| df4730e4-… | 18:07:49.285424Z | false | **null** | **null** |
| 0d03680b-… | 18:07:49.365424Z | false | **null** | **null** |
| a06aff67-… | 18:07:49.413119Z | false | **null** | **null** |

Dessas 4, **3 são vazias** (zero avaliação) e **1 é a real** (`a06aff67`). E a real
ainda tem as avaliações duplicadas — `supplement_evals` dela:

| ronda_id | trough_score | sacks | created_at |
|---|---|---|---|
| a06aff67 | VAZIO | 2 | 10:05:29 |
| a06aff67 | VAZIO | 2 | 10:05:29 | ← duplicata exata |
| a06aff67 | ADEQUADA | 3 | 10:05:44 |
| a06aff67 | ADEQUADA | 3 | 10:05:44 | ← duplicata exata |

→ 2 leituras de cocho reais viraram 4 registros.

## Dois sinais que apontam pra causa

1. **Cada duplicata tem um UUID diferente.** Não é re-envio do mesmo registro com
   o mesmo id (que um upsert resolveria) — é **INSERT novo a cada vez**, com id
   novo. Por isso nada deduplica naturalmente.
2. **`local_updated_at` e `pending_sync` estão `null`** nessas linhas. No schema
   SQLite local, `local_updated_at` tem `DEFAULT (datetime('now'))` — ou seja,
   toda linha criada no device carrega esse campo. Estar `null` no Supabase indica
   que **o push escreveu direto no Supabase montando o payload do zero** (só
   `paddock_id, user_id, date, completed, created_at`), sem repassar o id/colunas
   de sync da linha local. Combinado com (1), o push está **inserindo o mesmo
   registro lógico várias vezes** (retry sem idempotência, ou push concorrente, ou
   loop), gerando ids novos a cada insert.

## Tendência (está piorando)

| Dia | linhas de ronda | vazias (duplicatas) | talhões (linha) | talhões reais (c/ aval) |
|---|---|---|---|---|
| 2026-06-05 | 16 | **0** | 15 | 15 |
| 2026-06-06 | 13 | 3 | 9 | 9 |
| 2026-06-07 | 0 | 0 | 0 | 0 |
| 2026-06-08 | 47 | **27** | 23 | **17** |

05/06 estava limpo; 08/06 explodiu. Algo no fluxo de sync regrediu ou um device
passou a re-sincronizar em duplicidade.

## Onde investigar no código

- O **push de sync** pra Supabase (provavelmente em `app/src/lib/sync/` ou
  `app/src/lib/db/` — procure por `INSERT`/`upsert`/`from('rondas')`). Ver
  `SYNCED_TABLES` em `app/src/lib/db/schema.ts`.
- Checar se o push de `rondas` (e dos `*_evals`):
  - usa **o id local como PK no Supabase** (mesmo UUID) ou **gera um novo** no
    insert. Deve reusar o id local.
  - faz **`upsert` on conflict (id)** ou **`insert` puro**. Deve ser upsert.
  - tem **idempotência/lock** contra disparo duplo (retry, foco/reconexão,
    múltiplas chamadas concorrentes do push).
  - marca `pending_sync = 0` **após** confirmar — se nunca marca, o registro fica
    pendente e é reenviado (criando nova duplicata se o insert gera id novo).

## Correções recomendadas

1. **Idempotência no push:** PK estável (UUID gerado no device 1×) + `upsert`
   `onConflict: 'id'`. Assim re-sync não cria linha nova.
2. **Limpar duplicatas já existentes** no Supabase (rondas vazias + evals
   repetidos). Sugestão de critério: por `(paddock_id, user_id, date)`, manter a
   ronda com avaliações e remover as vazias; para evals, dedup por
   `(ronda_id, trough_score, sacks_in_trough, created_at)`.
3. **Guard contra push concorrente** (mutex/flag "sync em andamento").
4. (Opcional) **Constraint** no Supabase pra barrar evals idênticos
   (`unique (ronda_id, created_at, trough_score)` ou similar). Cuidado: rondas
   legítimas múltiplas por talhão/dia existem (ex.: P50 teve 2 reais), então
   **não** botar unique em `rondas(paddock_id, user_id, date)`.

## Queries úteis (Supabase REST, com JWT de admin)

```
# rondas vazias do dia (sem nenhuma avaliação) — candidatas a remoção
GET /rest/v1/rondas?date=eq.2026-06-08&deleted_at=is.null&select=id,paddock_id
# depois cruzar com cada *_evals?ronda_id=in.(...) e remover as sem match

# evals duplicados de uma ronda
GET /rest/v1/supplement_evals?ronda_id=eq.<id>&select=id,trough_score,sacks_in_trough,created_at&order=created_at
```

## Como o relatório/dashboard são afetados

- **Relatório diário** (`gestao-pecuaria-dashboard/relatorio-diario/daily_report.py`):
  já **blindado** — só conta ronda com ≥1 avaliação real; linhas vazias são
  descartadas e contadas na "Leitura do dia". Com isso 08/06 caiu de 23→17
  talhões e P57 de 4→1 ronda.
- **Dashboard** (`gestao-pecuaria-dashboard/src/lib/queries.ts`): **ainda conta
  linhas de ronda** (mostra os 23 inflados). Quando a origem for corrigida, ele
  volta a bater sozinho; ou aplicar a mesma blindagem (contar só ronda com aval).

---
*Gerado a partir de dados ao vivo (Supabase `fxtescythawmbwkthbyb` via proxy) em 2026-06-08.*
