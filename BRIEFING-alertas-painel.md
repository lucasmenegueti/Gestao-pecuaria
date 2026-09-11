# Briefing — Revisão e proposta de alertas/indicadores do Painel

Data: 2026-09-10. Base: código de `alerts.ts`/`settings.ts`/`bombona.ts`/`paddock-info.ts` + agregados do Supabase de produção (`fxtescythawmbwkthbyb`, leitura apenas).

## O que o histórico real diz (produção, abr–set/2026)

- **2.741 ronda-dias** em 140 piquetes desde 28/04. Cadência excelente: gap mediano entre rondas do mesmo piquete = **1 dia**, p90 = **3 dias**. Hoje, **zero** piquetes com gado estão há ≥3 dias sem ronda.
- **33 piquetes com gado**, todos com bombona cadastrada (o gap "gado sem bombona" é teórico hoje, mas sem guarda).
- **Forragem: 0 avaliações em toda a história do app.** A seção existe, nunca foi usada. Peso visual: esporádico (0 em setembro). Sanidade: esporádico.
- **Rotas de reabastecimento: 22 no total desde maio (17 `completed`, 5 `cancelled`), nenhuma presa aberta** — ~1 rota/semana, higiene em dia.
- `min_sacks` (estoque mínimo) está **definido em 5 fórmulas** no admin, mas o alerta de central **ignora** — usa só projeção de consumo.
- Fórmulas: **6 com alvo por cabeça** (100–300 g/cab/dia), **3 legado** (< 1, unidade antiga). Peso médio do rebanho: 415 kg.
- Rebanho (120 dias): 387 transferências, 51 nascimentos (213 cab), 14 mortes (15 cab), 6 compras, 5 vendas.

## Parte 1 — Revisão: o que está errado ou faltando hoje

### 1.1 (CRÍTICO) O modelo de consumo do Painel contradiz a semântica real do alvo

`alerts.ts` (bombona e central) calcula `dailyKg = pesoVivoTotal × alvo / 1000` — trata o alvo como **g/kg PV/dia**. Mas o alvo real é **g/CABEÇA/dia** (gotcha documentado no CLAUDE.md; `paddock-info.ts` já usa a semântica certa e descarta alvos < 1).

Efeito com números de produção: lote de 40 cab × 415 kg, fórmula de 100 g/cab → o alerta calcula **1.660 kg/dia** quando o real é **~4 kg/dia**. Superestimativa de ~400×. Consequência: pras 6 fórmulas corretas, `daysLeft` é sempre ~0 → **bombona e central berram "danger" permanentemente** → alerta virou ruído e deixou de informar. (Pras 3 fórmulas legado o cálculo por acaso fecha — são as únicas em que o alerta "funciona".)

**Raio da explosão — não é só o Painel.** O mesmo helper errado (`dailyConsumptionKg` em `constants/index.ts`) alimenta a lista da tab **Ronda** (`ronda.tsx:75`, "dias de cocho" por piquete) e o resumo da **Suplementação** (`supplement/summary.tsx:31`). São 4 pontos exibindo dias-de-cocho com o mesmo modelo.

**Correção proposta** (alinhada ao princípio "ledger sobre projeção"):
- **1ª escolha:** consumo **medido** — kg/dia real dos abastecimentos do ledger. `supplementRate` (`paddock-info.ts`) já implementa a conta, mas é **por piquete agregando fórmulas** e exige `entryDate` do lote — o alerta de bombona é por (piquete, fórmula) e o de central é por fórmula na fazenda toda. Precisa de uma variante por fórmula, não é drop-in.
- **Fallback:** `cabeças_não_mamando × alvo / 1000` (excluindo BEZERRO/A MAMANDO). Pré-condição: só vale pra alvo ≥ 1 — corrigir as 3 fórmulas legado (item I) fecha o buraco.
- Corrigir `dailyConsumptionKg` na fonte conserta os 4 pontos de uma vez.

### 1.2 Nenhuma noção de "atraso" (staleness) em lugar nenhum

Tudo no Painel é "hoje" ou "última avaliação". Nada diz: piquete X sem ronda há 5 dias, rota aberta desde terça, sem sync há 2 dias, solicitação parada há 1 semana. Hoje a operação está em dia (por isso não dói), mas **quando falhar, ninguém vê** — e o histórico de threads abertas inclui exatamente "sync parando em silêncio".

### 1.3 Duplicidade de limiar no estoque central

Dois mecanismos pro mesmo problema: `min_sacks` (admin define por fórmula, tela Formulações) e `alert.central.warn_days` (projeção 30 dias). O alerta só usa o segundo; o primeiro é letra morta. Decidir: ou o alerta passa a usar `max(projeção, min_sacks)`, ou aposenta `min_sacks` da UI.

### 1.4 Rota esquecida aberta não vira alerta (guarda preventiva)

Hoje a higiene está em dia (nenhuma rota presa em `in_progress` no servidor), mas o histórico tem o precedente da "rota fantasma" (v0.7.5) e o banner do Painel só aparece pra quem está com a rota no próprio device. Um alerta de "rota aberta há mais de N dias" é guarda barata contra regressão.

### 1.5 Sinais coletados que nunca chegam ao Painel

- `ledgerNegative` (`bombona.ts`): "o sistema perdeu a conta desta bombona" — existe, é calculado, não vira alerta.
- `forage_evals` × `grass_types.entry/exit_height_cm`: alerta de "capim no ponto/estourado" é impossível hoje porque **ninguém coleta forragem** (0 registros). Sem coleta não há alerta — decisão de processo antes de código.
- `visual_weight_evals` → GMD (`paddock-info.ts` já calcula): dados esparsos demais pra alertar com confiança.
- `herd_events` MORTE/ABORTO: são digitados pelo admin (ele já sabe na hora); valem como **indicador mensal** no Relatório, não como alerta.
- `schedule_tasks` vencidas: board ainda vazio em prod; alerta barato de fazer quando o cronograma pegar tração.

## Parte 2 — Proposta

### Alertas — construir primeiro (P1)

| # | Alerta | Regra (warn / danger) | Fonte | Quem vê | Resolve em | Settings (default) |
|---|--------|----------------------|-------|---------|------------|--------------------|
| A | **Dias de cocho corrigidos** (bombona + central) | mantém warn 3d / danger 0d (bombona) e 30d / 7d (central) — muda só o **denominador** (consumo medido → fallback por cabeça) | `supplementRate` + `loadBombonaExpectations` | ambos | ronda/reabastecimento | reusa `alert.bombona.*` / `alert.central.*` |
| B | **Piquete com gado sem ronda há N dias** | warn ≥ 4d / danger ≥ 7d (p90 real = 3d; warn em 3 dispararia falso toda segunda após fim de semana sem ronda) | `rondas.date` × `herd` | ambos | menu da ronda | `alert.ronda_atrasada.enabled/warn_days/danger_days` (1/4/7) |
| C | **Rota de reabastecimento esquecida** | warn > 1d aberta / danger > 3d | `resupply_routes.status + created_at` | ambos | tela da rota (continuar ou finalizar) | `alert.rota_aberta.enabled/warn_days/danger_days` (1/1/3) |
| D | **Sem sincronizar há N horas** | warn ≥ 12h / danger ≥ 48h (com pendências locais: danger ≥ 24h) | `sync_state.last_sync_at` (local, não sincroniza) | ambos | toque = forçar sync | `alert.sync.warn_hours/danger_hours` (12/48) |
| E | **Bombona com conta perdida** | warn quando `ledgerNegative` | `loadBombonaExpectations` | admin | ronda de Bombona (contagem re-ancora) | `alert.bombona_ledger.enabled` (1) |

B é o mais valioso: é o único que pega "peão parou de rondar um piquete" — a falha operacional mais cara e hoje invisível.

### Precisa de decisão do Lucas antes (P2)

| # | Item | Decisão pendente |
|---|------|------------------|
| F | Central abaixo de `min_sacks` | usar `min_sacks` como piso do alerta central, ou remover o campo da UI? |
| G | Alerta de forragem (altura vs saída do capim) | só faz sentido se a coleta de forragem virar rotina (via Solicitações?); hoje 0 registros |
| H | Tarefa de cronograma vencida (admin) | esperar o board ter uso real em prod |
| I | Corrigir as 3 fórmulas legado (alvo < 1) no Supabase | thread já aberta (Probeef Reprodução); libera o fallback por cabeça pra todas |

### Não vale a pena (agora)

- **GMD abaixo de alvo**: exige alvo novo por lote + pesagens regulares que não existem.
- **Mortalidade/aborto como alerta**: admin digita o evento, já sabe. Vira indicador mensal no Relatório.
- **Lotação acima do teto**: não existe coluna de lotação máxima por piquete; parâmetro novo + pouca dor relatada.

### Indicadores (KPIs, sempre visíveis — não confundir com alertas)

- **Manter**: "Rondas completas hoje" + barra de progresso (peão e admin).
- **Adicionar (admin only, 1 linha compacta)**: `X cab · Y piquetes com gado · Z cab/ha média` — do `herd`/`paddocks`, query barata, dá o "tamanho da operação" de relance.
- **Não adicionar mais que isso no peão**: tela de campo, 1 KPI + alertas já é o teto.

## Premissas assumidas (corrigir se errado)

1. Painel continua diferenciado por papel: staleness e operação pro peão; rebanho/hygiene pro admin.
2. Régua de "sem ronda" conta dias corridos, com warn em 4 pra absorver o fim de semana — em produção domingo teve ronda em só 8 de ~19 semanas, sábado em 9 (não é operação 7/7).
3. Currais de confinamento (capim "Confinamento") entram na mesma régua de ronda dos piquetes — se não, excluir por `grass_type`.
4. Nenhuma mudança de schema remoto é necessária pro P1 (só chaves novas em `app_settings`, que já sincroniza desde v0.7.8).
