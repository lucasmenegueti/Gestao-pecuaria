# Log de Versões — Gestão Pecuária NSA

Histórico de versões nomeadas do projeto. Cada versão tem uma tag git correspondente (`git tag -l`) para permitir rollback rápido: `git checkout v0.X.0`.

Convenção: versionamento semântico `vMAJOR.MINOR.PATCH`. Cada nova versão inclui seção **Fallback** apontando a tag anterior recomendada para rollback.

---

## v0.5.2 — "Safe area + ronda rule + tiles offline" (2026-04-18)

Hotfix pros 3 bugs encontrados no primeiro APK instalado no Tab A9:

- **Android edge-to-edge**: `SafeAreaProvider` agora envolve o root (`app/_layout.tsx`) e todas as 21 telas migradas para `SafeAreaView` do `react-native-safe-area-context` (em vez do SafeAreaView do react-native, que não respeita `edgeToEdgeEnabled: true`). O `(tabs)/_layout.tsx` aplica `insets.bottom` no tabBar pra não sobrepor a nav bar do sistema.
- **Ronda só conta como feita com ≥ 2 itens**: `alerts.ts` agora filtra por `COUNT(DISTINCT tipo_de_avaliacao) >= 2` antes de incluir no progresso "rondas feitas hoje". Abrir piquete + preencher só um item não conta mais. Query usa `UNION ALL` + `DISTINCT` por subquery (barato, semanticamente correto — múltiplas avaliações do mesmo tipo não inflam o count).
- **Mapa satélite offline**: `FarmMap.native.tsx` agora usa `baseUrl: 'file:///'` no WebView + `mixedContentMode="always"` pra permitir que tiles empacotados (`file:///android_asset/...`) carreguem de dentro de HTML inline. Sem isso, o WebView caía em `about:blank` e same-origin bloqueava as imagens — só apareciam os polígonos dos piquetes.
- **Ganho de perf junto**: `WebView.source` memoizado (evita reload do Leaflet + 2700 tile lookups a cada re-render do parent); 9 índices SQLite aditivos em `rondas(date)` + `ronda_id` das 8 eval tables (dashboard focus não faz mais full-scan).
- **EAS deploy**: projeto inicializado no EAS (`extra.eas.projectId` em app.json), eas.json ganha campo `environment` em cada profile pra variáveis do Supabase serem injetadas no build, `.easignore` exclui pastas de debug (`bugs app/`, `erros/`, `prints/`, `tmp/`).

**Fallback:** `git checkout v0.5.1` — volta ao estado anterior (safe area quebrada no Android 15, ronda contando com 1 item, mapa sem tiles).

---

## v0.5.1 — "Logout offline silencioso" (2026-04-17)

Hotfix pra red box do LogBox (`TypeError: Network request failed`) que aparecia ao sair do app em modo avião.

- **Custom fetch na Supabase client** (`app/src/lib/supabase/client.ts`): intercepta chamadas quando NetInfo reporta offline. Para `/auth/v1/logout` devolve 204 (permite ao auth-js completar cleanup local do AsyncStorage); demais endpoints recebem 503 sintético. Isso evita o `console.error(e)` do auth-js em `lib/fetch.js:97` que virava red box do LogBox em dev sempre que o app tentava logar/sincronizar offline.
- **`logout()` usa `scope: 'local'`** (`app/src/stores/authStore.ts`): evita invalidar sessões em outros dispositivos e combina com o custom fetch pra logout silencioso quando offline.
- **Módulo `netStatus`** (`app/src/lib/netStatus.ts`): única fonte de verdade sobre conectividade. Antes tínhamos listeners/fetches NetInfo duplicados em `supabase/client.ts` e `sync/daemon.ts` — agora compartilham uma subscription via `isOnline()` / `onNetChange()`.

**Fallback:** `git checkout v0.5.0` — volta ao comportamento com red box intermitente em dev quando offline (não afeta funcionalidade, só UX de desenvolvedor).

---

## v0.5.0 — "Mapa OSM Bundled + Pastos v5" (2026-04-17)

Dados geográficos atualizados e mapa totalmente offline (tiles OSM empacotados no app).

- **KML v5 da fazenda**: `kml/Fazenda NSA - Pastos v5.kmz` substitui o antigo `Area aberta NSA`. Parser atualizado para ler `<MultiGeometry>` (Polygon + Point por Placemark) e extrair metadados do `<description>` (Retiro, Area aberta, IdPasto).
- **125 piquetes** seedados (antes: 37), divididos em NSA I (109) e NSA II (16). Nomes recebem prefixo do retiro quando há ambiguidade (`NSA I P11` vs `NSA II P11`).
- **Mapa satélite Esri + Leaflet**: web e native usam imagens de satélite do Esri World Imagery (grátis, sem API key) via Leaflet — ideal pra fazenda, mostra vegetação/trilhas/cercas em vez de ruas. Nativo migrado de `react-native-maps` para `WebView + Leaflet`. Dependência `react-native-maps` removida; `react-native-webview` e `expo-asset` adicionadas.
- **Tiles empacotados no app**: script `scripts/fetch-tiles.mjs` baixa ~2700 tiles satélite do bbox da fazenda (zooms 12–17) para `app/assets/tiles/` e gera `components/map/tile-manifest.ts` com `require()`s estáticos. Tiles viram assets do APK — funcionam 100% offline desde o primeiro boot, sem download no dispositivo. Script deve ser rodado quando o KML mudar ou ~1×/mês para refrescar.
- **GPS no mapa**: ponto azul do usuário + círculo de precisão atualiza em tempo real enquanto anda. Botão flutuante "◎" centraliza o mapa na posição atual. Usa `expo-location` com `watchPositionAsync` (high accuracy, 5m de intervalo) no native e `map.locate({watch: true})` no web. Permissão solicitada ao abrir a tela Mapa pela primeira vez.
- **Ronda filtra piquetes com gado**: o Painel e a aba Ronda só mostram/contam piquetes com `herd.head_count > 0`. Com 125 piquetes no KML mas nem todos ocupados, a lista de rondas pendentes fica enxuta — só pastos que realmente precisam de avaliação.
- **Leaflet inline no WebView**: `scripts/bundle-leaflet-inline.mjs` empacota Leaflet (~160 KB) como strings em `components/map/leaflet-inline.ts`. O WebView não depende de CDN.
- **Schema version 5 → 6**: dropa e re-seeda `paddocks` / `water_tanks` / `farm_boundaries` ao abrir o app após atualização. Caixas d'água (4) e limite NSA2 mantidos estáticos no script (não vêm do novo KML).

**Como regenerar os tiles (mensal):**
```bash
cd app && node scripts/fetch-tiles.mjs
```
Commitar `app/assets/tiles/` + `app/src/components/map/tile-manifest.ts` após rodar.

**Fallback:** `git checkout v0.4.0` — volta ao mapa anterior com 37 piquetes e ESRI/Google Maps.

---

## v0.4.0 — "Rebanho com Pool e Desalocação" (2026-04-14)

Redesign completo da gestão do rebanho para refletir a realidade da fazenda: lotes podem ficar **desalocados** (sem piquete) entre reagrupamentos. Regra: 1 piquete = 1 lote, exceção VACA + BEZERRO/A MAMANDO coexistem como lote de pares.

- **Schema**: `herd.paddock_id` passa a ser **NULLABLE** (`NULL = desalocado`). `herd_events.paddock_id` também, para eventos de alocação. Novos tipos: `DESALOCACAO`, `ALOCACAO`.
- **Tela Rebanho reescrita**: card de totais por categoria (farm-wide, 9 linhas), card de pool DESALOCADOS (só aparece se houver), lista por piquete com badge "LOTE DE PARES" quando há vaca + bezerro mamando, botões MOVER / DESALOCAR / ALOCAR / EVENTO.
- **Novo fluxo DESALOCAR** (`admin/desalocar.tsx`): escolhe piquete, slider por categoria (0 a qtd atual) ou "DESALOCAR TUDO", confirma. Aceita `?paddockId=X` via query param (botão por piquete na lista).
- **Novo fluxo ALOCAR** (`admin/alocar.tsx`): mostra pool, slider por categoria para compor lote, escolhe piquete destino, confirma. Alerta quando mistura categorias que não são vaca+bezerro mamando.
- **Evento ajustado**: no NASCIMENTO, se piquete tem VACA, pré-seleciona BEZERRO MAMANDO e filtra categorias para bezerro/bezerra mamando. Na MORTE, filtra categorias para aquelas presentes no piquete.
- **Mover rebanho**: origem filtra pool (só piquetes com gado); destino segue livre.
- Schema version 2 → 3 com drop/recreate de `herd` e `herd_events`, re-seed automático de `herd` via `SEED_HERD_SQL` extraído do seed.

**Fallback:** `git checkout v0.3.0` — volta ao modelo sem pool (herd.paddock_id NOT NULL). Atenção: se houver gado desalocado (paddock_id NULL) no momento do rollback, essas linhas precisarão ser realocadas ou removidas manualmente antes de operar no v0.3.0.

---

## v0.3.0 — "App Expo + Refinamentos de Fluxo" (2026-04-14)

Primeira versão do app Expo/React Native funcional no navegador e mobile. Inclui as features de base (auth, ronda, rebanho, estoque, mapa, admin, reabastecimento) e um conjunto de refinamentos de UX aplicados após validação em campo/browser:

### App base
- Estrutura Expo SDK 54 com expo-router, SQLite offline-first, Zustand
- 5 abas principais: Painel, Ronda, Rebanho, Estoque, Mapa
- Wizards de avaliação por piquete (Suplementação, Forragem, Aguada, Sanidade, Cerca, Peso Visual, Lavagem)
- Admin: CRUD de formulações e tipos de capim
- Reabastecimento em 3 fases (carregar / rota / resumo)
- Seed: 3 usuários (admin/joao.peao/maria.peao, senha 123456), 3 tipos de capim, 5 formulações

### Refinamentos de UX (aplicados nesta versão)
- **Bombona separada da Suplementação:** novo item no Menu de Avaliação com fluxo próprio (estoque → formulação → sacos → foto). Suplementação reduzida de 8 para 6 passos.
- **Sanidade em %:** slider 0–100% em vez de contagem absoluta de animais afetados. Mostra estimativa de cabeças para contexto.
- **Cerca com ordem invertida:** primeira pergunta agora é "A cerca evita a mistura?" (função); segunda é voltagem (medida).
- **Lavagem simplificada:** fluxo reduzido de 4 para 2 passos. Se o peão responder "Não lavou", volta ao menu sem criar registro.
- **Barra de navegação inferior no Menu de Avaliação** — antes o peão só podia sair do fluxo com VOLTAR repetido. Agora acessa qualquer aba principal em 1 toque. (Wizards internos mantidos sem barra para proteger o preenchimento.)
- Nova tabela `bombona_evals`. Schema versão 2 com migração automática (drop/recreate das tabelas alteradas: supplement_evals, health_evals, washing_evals).

### Configuração
- `metro.config.js` com `.wasm` como asset (necessário para expo-sqlite rodar no web)
- Provider de DB com versionamento (`PRAGMA user_version`) para permitir migrações futuras sem perda de dados de seed

**Fallback:** `git checkout v0.2.0` — retorna ao estado apenas com protótipo HTML (app Expo ainda não existia).

---

## v0.2.0 — "Protótipo UX Ajustes" (2026-04-09)

Ajustes no protótipo HTML antes da implementação no Expo:

- Dashboard: removido card de lotação geral, adicionado botão VER LOTAÇÃO
- Nova tela `15-lotacao.html` com lotação geral e por piquete
- Aguada: 4 níveis de qualidade (excelente / boa / mediana / ruim) com descrições
- Aguada: removidos passos de lavagem (extraídos para wizard próprio)
- Novo wizard Lavagem de Bebedouro (`18-lavagem-1` a `18-lavagem-4`)
- Menu de avaliação com 8 cards (inclui Lavagem Bebedouro)

**Fallback:** `git checkout v0.1.0` — retorna ao protótipo HTML original.

---

## v0.1.0 — "Protótipo HTML" (2026-04-09)

- Protótipo HTML navegável (48 arquivos em `prototipo/`) para validação UX com peões
- Deploy via GitHub Pages (branch `gh-pages`)
- Base para a estrutura do app Expo/React Native

**Fallback:** nenhum (versão inicial).

---

## Como criar uma nova versão

1. Incrementar a versão seguindo `vMAJOR.MINOR.PATCH`:
   - `PATCH` — bug fix pontual
   - `MINOR` — nova feature ou refinamento de UX sem quebrar fluxo
   - `MAJOR` — mudança que obriga migração de dados ou re-treinamento do peão
2. Adicionar entrada no topo deste arquivo: nome, data (ISO), descrição
3. Incluir seção **Fallback** apontando a tag anterior recomendada
4. Após commit:
   ```bash
   git tag -a v0.X.0 -m "nome da versão"
   git push origin v0.X.0
   ```

## Como reverter

```bash
# Visualizar código de uma versão antiga (read-only)
git checkout v0.X.0

# Criar branch a partir dela para corrigir
git checkout -b hotfix/descricao v0.X.0

# Forçar branch atual para essa versão (DESTRUTIVO — perde trabalho não commitado)
git reset --hard v0.X.0
```

Em caso de rollback de schema de DB: a migração em `src/lib/db/provider.tsx` usa `PRAGMA user_version`. Ao voltar para versão com schema antigo, o app detecta a diferença e recria as tabelas. Dados de seed (usuários, formulações, tipos de capim, piquetes, rebanho) são preservados.
