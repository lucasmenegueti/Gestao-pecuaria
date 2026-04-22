# Log de Versões — Gestão Pecuária NSA

Histórico de versões nomeadas do projeto. Cada versão tem uma tag git correspondente (`git tag -l`) para permitir rollback rápido: `git checkout v0.X.0`.

Convenção: versionamento semântico `vMAJOR.MINOR.PATCH`. Cada nova versão inclui seção **Fallback** apontando a tag anterior recomendada para rollback.

---

## v0.6.0 — "Hardening pré-1.0: sync visível, transações, circuit breaker, UX consistente" (2026-04-21)

Audit completo do código por 4 agentes em paralelo (sync/bugs/qualidade/UX). Consolidados 10 fixes P1+P2 + 2 P3. Release candidate pra 1.0.

**P1 — Bloqueantes (perda de dado, app preso):**
- **Sync visível** (v0.5.10): login.tsx mostra Alert com "Tentar de novo" se pullDelta falhar; (tabs)/index.tsx handleSync distingue sem conexão/modo offline/erro de rede com mensagens pro peão (antes `console.warn` só em __DEV__); supabase/client.ts timeout 10s → 30s pra rede de sítio.
- **Transações atômicas** (v0.5.11): `db.withTransactionAsync` em alocar, desalocar, evoluir, evento. Antes, falha no meio do loop deixava estado parcial (piquete com 2 categorias alocadas e 3ª incompleta). Agora tudo-ou-nada via rollback automático.
- **Double-tap guard em resumo** (v0.5.12): resumo.tsx `finishingRef` contra state async; bloco de devolução ao central + fechamento da rota em withTransactionAsync. Antes, 2 taps = inventário creditado 2x.
- **Mount guard em carregar** (v0.5.13): `cancelled` flag no useEffect cleanup impede router.replace/setState pós-unmount quando user sai/volta rápido.
- **Resumo loadSummary try/catch** (v0.5.12): Alert se query falhar — antes, tela com dados parciais sem feedback.

**P2 — Qualidade (recuperável mas importante):**
- **Circuit breaker + daemon watchdog** (v0.5.14): rows que falham 3x no push (ex: RLS policy) entram em deferred até próximo boot/forceSync — para de queimar bateria/logs. RLS fails logam como ERROR (visível em Logs do Painel). Daemon watchdog 60s libera state.running travado — antes, throw silencioso parava sync até app restart.
- **Schema migration visível** (v0.5.15): antes de DROP TABLE em migration, conta rows pending_sync=1 e emite WARN. Trackeable se alguma migration zerar trabalho local não sincronizado.
- **Sentence case em 13 wizards** (v0.5.16): "VOCÊ ABASTECEU O COCHO?" → "Você abasteceu o cocho?", etc. Cumpre regra do NSA design system. Valores no DB inalterados.
- **Hex hardcoded → tokens** (v0.5.17): 5 calcCards trocaram `#fdebd0`/`#e3f2fd`/`#f3e5f5`/`#2980b9`/`#eaf5ec` por `NSA.warnBg/infoBg/okBg` + `DOMAIN.sanidade.tint/dot`. Compliance com design system.

**P3 — Polimento (parcial):**
- `<StickyFooter>` primitive criado mas não aplicado nas 12 telas (migração gradual pós-release pra não arriscar layout).
- `console.log/warn/error` fora do logger envolvidos em `if (__DEV__)` — sem ruído em prod.

**Fallback:** `git checkout v0.5.9`.

**Hotfix restante pra v1.0.1+:** useFinalizeWizard hook, sticky footer migrado nas 12 telas, RLS policies no Supabase (fora do app), seed local como fallback pra quando pullDelta não completar.

---

## v0.5.9 — "Slider do ajuste manual destravado" (2026-04-21)

Hotfix dedicado do SliderInput:

- **SliderInput com max dinâmico** (`components/ui/SliderInput.tsx`): o `PanResponder` era criado 1x via `useRef` e capturava as props da 1ª render via closure. Em telas onde `min/max/step` mudam (ajuste manual de estoque troca o teto ao trocar produto/modo), arrastar o slider chamava `updateFromPageX` com bounds antigos — a barra parecia travada. Fix: handler via ref atualizada a cada render (`updateRef.current`), o PanResponder chama através do ref. Resultado: drag, `+`/`-` e teclado (clique no número) agora usam os mesmos bounds. Afeta `estoque/ajuste.tsx` (onde o bug apareceu) + todas as outras telas com slider (sem regressão — bounds estáticos continuam funcionando igual).

**Fallback:** `git checkout v0.5.8`.

---

## v0.5.8 — "Finalizar ronda volta pra lista de piquetes" (2026-04-21)

Ajuste direto de UX após teste no Tab A9:

- **Finalizar ronda → lista de piquetes** (10 summaries + `washing/step1.tsx`): na v0.5.7 troquei `router.replace('/ronda/X/menu')` por `router.dismissAll()` — mas isso ainda deixava o usuário na tela de eval do piquete (suplementação/bombona/forragem/etc). O peão relatou que quer voltar direto pra lista de piquetes (ronda tab) pra pegar próximo piquete. Trocado para `router.replace('/(tabs)/ronda')`, que pula o menu intermediário e cai direto na lista.

**Nota sobre DB/sync**: o screenshot `erros/Screenshot_20260420_223316` mostra logs de `push_insert_failed` em `herd` e `herd_events` com erro `new row violates row-level security policy`. RLS do Supabase precisa de policy de INSERT pro usuário autenticado — fica pra v0.5.9 junto com o fallback pra quando o pull inicial falhar (hoje DB fica vazia se sync não completar).

**Fallback:** `git checkout v0.5.7`.

---

## v0.5.7 — "Polimento UI + ajuste ±  + NOVILHA PRENHA + logo novo" (2026-04-20)

Rodada de fixes pós-teste no Tab A9:

- **Alocar/desalocar/evoluir/mover sem categoria zerada** (`admin/alocar.tsx`, `admin/desalocar.tsx`, `admin/evoluir.tsx`, `admin/mover-rebanho.tsx`): as 4 telas aplicam `AND h.deleted_at IS NULL` + `AND h.head_count > 0` (ou `HAVING SUM > 0`) pra nunca mostrar BEZERRO MAMANDO · disponível 0. Consistente com o filtro já aplicado em `(tabs)/rebanho.tsx` na v0.5.6.
- **Voltar sempre volta pra tela de piquetes** (10 summaries de ronda + `washing/step1.tsx`): trocado `router.replace('/ronda/X/menu')` por `router.dismissAll()`. O replace deixava os steps do wizard empilhados no Stack aninhado (`[paddockId]/forage/_layout.tsx` etc.), então depois de finalizar N rondas o user precisava apertar voltar N vezes. dismissAll pops só o wizard nested Stack e aterrissa no menu original do piquete — 1 press basta.
- **UI antiga em 3 telas** (`supplement/step7.tsx`, `forage/step1.tsx`, `forage/step5.tsx`): removidos emojis (`🟢🟡🔴`) das MultiChoice — o CLAUDE.md já proíbe mas essas 3 telas escaparam. Labels convertidos de CAIXA ALTA pra Sentence case (`BOM` → `Bom`, `ENTRADA` → `Entrada`, etc.). Valores no banco mantidos inalterados (não requer migration).
- **Categoria NOVILHA PRENHA** (`constants/index.ts`): novo estágio etário entre NOVILHA e VACA PARIDA. Peso default 310 kg. Fluxo: `NOVILHA → [VACA SOLTEIRA, NOVILHA PRENHA]` (MultiChoice no evoluir.tsx) e `NOVILHA PRENHA → VACA PARIDA` (destino único quando pare).
- **Sacos só em inteiros** (`bombona/step3.tsx`, `supplement/step4.tsx`, `reabastecimento/rota.tsx` ×2): `step={0.5}` → `step={1}`. Peão não fracciona saco na prática. Clique no número do SliderInput abre teclado numérico pra digitar qualquer valor dentro do range — já existia, preservado.
- **Sticky footer universal** (`(tabs)/estoque.tsx`, `reabastecimento/carregar.tsx`, `reabastecimento/resumo.tsx`, `estoque/ajuste.tsx`, `estoque/entrada.tsx`, `admin/desalocar.tsx`, `admin/evoluir.tsx`): todos os CTAs primários ("Reabastecer bombonas", "Iniciar rota", "Confirmar e finalizar", "Revisar e confirmar", etc.) agora ficam travados no pé da tela, fora do ScrollView. Peão não precisa mais rolar até o fim pra achar o botão. `paddingBottom` do scroll aumentado pra não deixar a última Card ficar embaixo do footer.
- **Ajuste manual com entrada + saída** (`estoque/ajuste.tsx` reescrito): toggle ± no topo. Modo **Adicionar** aplica delta positivo com `event_type='AJUSTE_GANHO_CENTRAL'` e cria a inventory row se ela não existir (permite abrir saldo de fórmula nova). Modo **Remover** (antigo fluxo) continua como `AJUSTE_PERDA_CENTRAL`. Seletor de produto mostra todas as fórmulas ativas quando modo=add, só as com saldo quando mode=remove. Copy do aviso agora genérico ("Diferenças positivas ou negativas são contabilizadas"). Cor do botão final muda conforme o modo (primary / danger).
- **Logo do launcher novo** (`app/assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`): substituídos por `logos/icon_1024.png` (1024×1024 RGBA) e `logos/icon_512.png` (favicon). `app.json` bump para `version: 1.0.1` pra forçar atualização do ícone no APK preview.

**Fallback:** `git checkout v0.5.6` — volta ao estado anterior (categorias com 0 aparecendo, voltar precisando press múltiplos, emojis na UI, só remover no ajuste, sliders em 0.5, logo antigo).

---

## v0.5.6 — "Reabastecimento persistente + voltar confiável + rebanho sem zeros" (2026-04-19)

Três fixes focados em confiabilidade de fluxo e contabilidade:

- **Reabastecimento: rota persistente e retomável** (`src/lib/reabastecimento/active-route.ts` novo + `reabastecimento/carregar.tsx` + `reabastecimento/rota.tsx` + `(tabs)/estoque.tsx` + `(tabs)/index.tsx`): o carregamento do trator agora roda em `db.withTransactionAsync` — se qualquer passo falhar, rollback completo e nenhum saco some da central sem ter uma rota que o represente. `carregar.tsx` entra checando `getActiveRoute()`: se já tem rota `in_progress`, redireciona direto pra `rota?routeId=X` (proíbe 2ª rota simultânea). **Banner "Rota em andamento"** no topo do Painel e do Estoque mostra quantos sacos estão no trator e leva de volta à rota com 1 toque. Aba Central ganha card **"NO TRATOR (rotas em andamento)"** com o agregado por fórmula, fechando a conta `central + trator + bombona`. Botão **Cancelar** no header da rota faz devolução integral ao central em uma transação + evento `CANCELAMENTO_ROTA` + status `cancelled` — solução pra "iniciei errado, quero desfazer".
- **Voltar sempre funciona em 1 press** (`src/hooks/use-safe-back.ts` novo + `components/ui/BrandHeader.tsx` + `components/ui/WizardFlow.tsx`): hook único envolve o onBack do header/wizard aplicando `Keyboard.dismiss()` + debounce de 400ms (`ref`, que estado async não segura) + `requestAnimationFrame` pra não deixar o dismiss engolir o `router.back()`. Integra Android hardware back via `BackHandler` com a mesma lógica. Elimina "apertei 3x, voltou uma só" quando teclado estava aberto ou animação de transição comia a press. Novo prop `fallback` pra telas entradas via `router.replace` (reabastecimento/rota e /resumo) — usado quando `canGoBack === false`.
- **Rebanho sem categorias zeradas** (`src/app/(tabs)/rebanho.tsx`): as 3 queries (totais, pool, por-piquete) agora filtram `h.deleted_at IS NULL`, usam `SUM(h.head_count)` com `GROUP BY` + `HAVING SUM > 0`. Rows soft-deleted (mantidas com head_count=0 pra preservar `supabase_id` — ver comentário em `admin/desalocar.tsx`) não escapam mais pra UI. Piquetes sem gado não aparecem em "POR PIQUETE". Defesa em JS com `.filter(h => h.total > 0)` impede qualquer zero residual.

**Fallback:** `git checkout v0.5.5` — volta ao comportamento anterior (voltar engole press, reabastecimento invisível fora da URL, rebanho podendo exibir "0 cab" em categoria).

---

## v0.5.5 — "Configurações + Relatório diário + Mover UX" (2026-04-18)

Três frentes: configurações ajustáveis (cerca, alertas), nova tab de relatório e polimentos no fluxo de mover lote.

- **Mover lote · UX** (`src/app/admin/mover-rebanho.tsx`): botão **Mover** agora é sticky no footer (sempre visível durante a rolagem) e o campo "PARA (destino)" ganhou busca por nome de piquete — igual alocar.tsx.
- **Configurações** (`src/app/admin/index.tsx` novo): a engrenagem do Painel agora abre um índice com todas as opções: Formulações, Tipos de capim, **Cerca**, **Alertas**, Logs. Antes ia direto pra Formulações.
- **Cerca configurável** (`src/app/admin/cerca.tsx` novo + `src/lib/settings.ts` novo): 3 sliders pros thresholds de voltagem (FORTE / ADEQUADO / FRACO). Valores são persistidos em `app_settings` e guarda ordem `fraco < adequado < forte`. Prévia ao vivo mostra como cada voltagem seria classificada. `fence/summary.tsx` e `alerts.ts` passaram a ler esses thresholds em vez dos hardcoded.
- **Alertas configuráveis** (`src/app/admin/alertas.tsx` novo): cada alerta do Painel tem toggle individual + limiares. Cobre **Cocho** (dias warn/danger), **Estoque central** (dias warn/danger), **Sanidade** (% warn/danger), **Água** (chips de qualidades → warn/danger), **Cerca** (chips de classificações → warn/danger) e **Gado desalocado** (on/off). Desligar um alerta faz ele sumir do Painel e não entrar no feed.
- **Relatório diário** (`src/app/(tabs)/relatorio.tsx` novo — 6ª tab): navegação por dia (← hoje →) + 3 seções. **Ronda**: todas as rondas do dia com quais avaliações foram preenchidas e por quem. **Rebanho**: todos os `herd_events` do dia (ALOCACAO, TRANSFERENCIA, NASCIMENTO, MORTE, VENDA, COMPRA, EVOLUCAO) com categoria/quantidade/origem→destino/peso/notas/hora. **Estoque**: `inventory_events` com fórmula, sinal do delta, motivo e autor.
- **Schema v18**: `app_settings` (key-value) com defaults seedados via `INSERT OR IGNORE`. Os valores migram automaticamente na primeira subida; usuários com DB anterior continuam com os thresholds default (equivalentes aos hardcoded antigos).

**Fallback:** `git checkout v0.5.4` — volta ao estado sem relatório diário, com alertas/voltagens hardcoded e sem sticky footer em mover lote.

---

## v0.5.4 — "Rebanho: colapsáveis + Compra + Evoluir + alertas reorganizados" (2026-04-18)

Ajustes no fluxo da tela de rebanho (cards colapsáveis, novas ações, evolução etária), reorganização dos alertas do painel:

- **Cards de piquete colapsáveis** (`src/app/(tabs)/rebanho.tsx`): `POR PIQUETE` mostra só nome, área e composição por categoria. Toque no card revela as ações disponíveis — **Mover lote**, **Evoluir**, **Desalocar** e **Mortes** sempre; **Nascimentos** só se o piquete tiver VACA/NOVILHA. Um piquete expandido por vez (chevron indica estado). Botões globais "Mover rebanho" e "Evento" saíram do fluxo — cada ação agora é contextual ao piquete.
- **Comprar gado** (novo — `src/app/admin/compra.tsx`): botão logo abaixo da tabela de totais por categoria. Categoria + quantidade + peso médio (balança ou estimado, com default por categoria). Compra entra no pool de desalocados (`herd.paddock_id IS NULL`) + evento `COMPRA` em `herd_events` com `weight_kg`.
- **Categorias de rebanho expandidas** (`src/constants/index.ts`): adicionadas **BEZERRO** (180 kg), **BEZERRA** (170 kg) e **BOI** (550 kg) — intermediárias que faltavam no fluxo etário. `CATTLE_CATEGORIES` reordenado por evolução (mamando → desmamado → jovem → adulto). Novo mapa `CATEGORY_EVOLUTIONS` define o destino natural de cada estágio.
- **Evoluir rebanho** (novo — `src/app/admin/evoluir.tsx`): botão no card expandido do piquete. Mostra um card por lote com o próximo estágio sugerido (ex: `GARROTE → BOI`) e slider de quantidade. Quando o lote tem dois destinos possíveis (ex: NOVILHA → VACA SOLTEIRA ou VACA PRENHA pós-DG), exibe MultiChoice. Seção discreta "Ajuste manual de categoria" com aviso permite mover qualquer categoria → qualquer categoria pra corrigir erros. Eventos gravam `event_type='EVOLUCAO'` com notes `ORIGEM → DESTINO`.
- **Mover lote sem MultiChoice de categoria** (`src/app/admin/mover-rebanho.tsx`): categoria agora é deduzida do piquete de origem. **1 categoria** → só slider de quantidade + destino. **Múltiplas categorias** → default move o lote inteiro preservando composição; botão "Desagregar por categoria" abre sliders individuais. Origem aceita `?paddockId=` e trava o campo.
- **Alertas de cocho agora na seção RONDA do Painel** (`src/app/(tabs)/index.tsx`): "Cocho previsto vazio" / "Cocho · N dia(s)" deixaram de aparecer em ESTOQUE e passaram pra seção RONDA — afinal, é em ronda (reabastecimento ou suplementação) que o problema se resolve. ESTOQUE no Painel segue exibindo só alertas de estoque **central**, que dependem de ação administrativa.

**Fallback:** `git checkout v0.5.3` — volta ao rebanho com botões sempre visíveis, sem compra, sem evolução, sem categorias intermediárias, sem pré-seleção em mover rebanho e com alertas de cocho em ESTOQUE do painel.

---

## v0.5.3 — "Mapa via expo-asset + sync UX + min stock" (2026-04-18)

Segundo round de fixes após teste do APK preview no Tab A9:

- **Mapa** (`FarmMap.native.tsx`): tile URIs agora via `expo-asset` `Asset.loadAsync()` em vez de `Image.resolveAssetSource` — garante `file://` path confiável em Expo Go (dev server) e APK release (bundle). Loading state enquanto resolve, botão `⟳` discreto no canto superior direito pra forçar reload manual se algo travar.
- **Sync timestamp correto**: nova coluna `sync_state.last_sync_at` (schema v16, drop automático). `syncAll` grava timestamp em todo ciclo bem-sucedido, separado do cursor de delta sync (`last_pull_at`). Painel passa a mostrar "Sincronizado agora" imediatamente após click, não mais data antiga.
- **Sync não trava offline**: `handleSync` no Painel checa `isOnline()` + `offlineMode` antes de tentar. Se offline, só refresh da UI e volta ao status. Bônus: fetch do Supabase ganhou timeout de 10s pra não travar 30s+ quando Wi-Fi está conectado mas sem internet real.
- **Estoque mínimo por formulação** (`admin/formulas.tsx`): novo campo "Estoque mínimo (sacos)" no modal. Grava em `inventory.min_sacks WHERE location='central'` (cria linha se não existir). Dispara alertas no Painel quando cai abaixo.
- **Dashboard: seção inteira clicável**: cards RONDA / REBANHO / ESTOQUE agora são `TouchableOpacity` completo. Tocar em qualquer ponto (inclusive área de "sem alertas") navega pra aba. Linhas de alerta com onPress próprio continuam consumindo o toque.
- **Dev/Release flow registrado no CLAUDE.md**: Local (Expo Go) → APK preview → Produção. Obriga validação em cada estágio antes de promover.

**Fallback:** `git checkout v0.5.2` — volta ao estado com mapa sem tiles, sync timestamp estático, sync travando offline.

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
