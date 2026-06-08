# Relatório Diário da Pecuária — Fazenda NSA

PDF de 4 páginas gerado todo dia e enviado no WhatsApp (Z-API) às **19:15 GMT-3**.
Mesma pegada do `DRE-api/daily_report.py` (HTML → PDF → Z-API), para a operação de
pecuária, lendo o Supabase do app **Gestão Pecuária** (`fxtescythawmbwkthbyb`).

## Páginas

| # | Conteúdo |
|---|----------|
| 1 | **Mapa estilo dashboard** (todos os talhões, verde = com gado·ronda feita, vermelho = com gado·sem ronda, cinza = sem gado) + checklist por talhão rondado: **verificado** / **a verificar** (obrigatórios não preenchidos). |
| 2 | **Mudanças de pasto** (transferências), **nascimentos**, **mortes** + reclassificações de categoria (resumidas). |
| 3 | Estoque de produtos: **rotas de reabastecimento** do dia (onde + sacos), movimentações, estoque central e **alertas de mínimo**. Fórmulas inativas não aparecem; bombonas não são listadas. |
| 4 | Rebanho por **categoria** (Δ do dia) + **gado sem alocação**. |

## Dados

Lê via **login de admin → JWT** (RLS libera admin) direto no Supabase via REST —
sem service-role key. O mapa usa **uma** imagem de satélite Esri (export por bbox)
com os polígonos dos talhões por cima (SVG), coloridos por status.

## Setup local

1. `cp .env.example .env` e preencher `SUPABASE_*`, `NSA_USER`/`NSA_PASS`, `ZAPI_*`, `WHATSAPP_PHONE`.
2. Renderizador: `pip install weasyprint` (puro-Python, ideal nuvem) **ou** ter Chrome (fallback).

## Rodar

```bash
./run_daily_report.sh                 # hoje (GMT-3), gera e ENVIA
./run_daily_report.sh 2026-06-05      # data específica
python3 daily_report.py 2026-06-05               # só gera (não envia)
python3 daily_report.py 2026-06-05 --dump-fixture # gera + salva fixtures/<data>.json
python3 daily_report.py 2026-06-05 --data-file fixtures/2026-06-05.json  # offline (sem Supabase)
```

Saída em `out/<data> relatorio-diario-pecuaria.{html,pdf}`.

## Agendamento (19:15 GMT-3 = 22:15 UTC)

Roda como **Claude routine na nuvem** (mesmo modelo da routine "Relatório diário NSA
financeiro"): clona o repo, roda `run_daily_report.sh` e envia via Z-API. Cron
`15 22 * * *` (UTC). Segredos (`NSA_PASS`, `ZAPI_*`, etc.) ficam no **environment da
routine** — nunca no repo.
