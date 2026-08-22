# Log de Versões — Gestão Pecuária NSA

Histórico de versões nomeadas do projeto. Cada versão tem uma tag git correspondente (`git tag -l`) para permitir rollback rápido: `git checkout v0.X.0`.

Convenção: versionamento semântico `vMAJOR.MINOR.PATCH`. Cada nova versão inclui seção **Fallback** apontando a tag anterior recomendada para rollback.

---

## v0.7.17 — "teclado não cobre mais campo nem botão" (2026-08-21)

Reportado em Configurações › Formulações: com o teclado numérico aberto, "Estoque mínimo" e o botão Salvar ficavam embaixo dele, sem como rolar. O app **não tinha nenhum `KeyboardAvoidingView`** — o problema existia em toda tela com campo, não só nessa.

**Primitivo novo:** `src/components/ui/KeyboardAvoider.tsx`. `behavior="padding"` nos dois sistemas, deliberadamente: no Android o SDK 54 é edge-to-edge obrigatório e a janela não encolhe mais sozinha com o teclado; e onde ela ainda encolhe, o RN calcula `frame.y + frame.height − keyboardY`, que dá ~0 quando o frame já subiu — ou seja, não soma padding em cima do resize. Um `Platform.select` seriam duas rotas pra manter sem ganho.

**Aplicado em 31 telas** — todas que podem abrir teclado. A varredura inicial por `TextInput` achava só 14; o `SliderInput` tem um `TextInput` embutido (o número é editável ao toque), então **17 telas de slider também abriam teclado** e teriam ficado de fora. As telas de ronda vieram de graça: o `WizardFlow` recebeu o wrapper uma vez.

**Regras que o wrapper carrega** (documentadas no arquivo, porque cada uma corresponde a um jeito de errar):
- Envolver o ScrollView **e** o rodapé fixo juntos. Em `alocar`, `mover-rebanho`, `ajuste`, `rota`, `alertas` e `cerca` o rodapé é irmão do ScrollView — deixá-lo de fora mantém o botão de salvar enterrado, que é metade do bug.
- Cabeçalho fica de fora, pra continuar visível.
- Não combinar com `automaticallyAdjustKeyboardInsets` no ScrollView de dentro: os dois somam e abrem um vão morto do tamanho do teclado.

**Modais viraram roláveis.** Os cards de `formulas`, `grass-types` e `piquetes` eram `View` de altura livre num overlay centralizado, sem `maxHeight`: mesmo com o teclado tratado, o card era espremido e cortava o conteúdo em vez de rolar. Agora são `ScrollView` com `maxHeight: '100%'` e `flexGrow: 0`. Em `solicitacoes` o `maxHeight: 520` fixo da lista virou `flexShrink: 1`, senão não cabe no card encolhido.

**Login ganhou ScrollView.** Era a única tela sem nenhum — sem algo pra rolar, o `KeyboardAvoider` não tem pra onde empurrar. `contentContainerStyle: { flexGrow: 1 }` preserva a centralização vertical quando o conteúdo cabe.

**`keyboardShouldPersistTaps="handled"`** nos ScrollViews dessas telas: sem isso o primeiro toque no botão de salvar só fecha o teclado.

**Validado em emulador Android** (Pixel 7 / API 35, Expo Go, harness replicando as duas estruturas com o `KeyboardAvoider` real e toggle liga/desliga):
- **Modal de Formulações — resolvido.** Campo "Estoque mínimo" focado e Cancelar/Salvar inteiros acima do teclado. Quem resolve neste sistema é a mudança estrutural (card virou `ScrollView` com `maxHeight`): a janela do `Modal` é um Dialog separado e encolhe com o teclado, então o card recentra sozinho. O wrapper importa no iOS, não aqui.
- **Tela com rodapé fixo — melhorou, não fechou.** Sem o wrapper, o campo MOTIVO fica cortado na borda inferior e o botão some. Com ele, `measureInWindow` do rodapé vai de y=778 dp para y=549 dp (tela = 914 dp) — sobe 229 dp — mas termina em 611 dp contra o topo do teclado em 578 dp: **~33 dp do botão seguem cobertos**. Suspeita: o `SafeAreaView edges={['bottom']}` aplica o inset inferior dentro da área já encolhida. Não investigado até o fim.

**Não validado em iOS** — que é onde o bug foi reportado. Os dois sistemas usam mecanismos diferentes; o resultado do Android não transfere.

**Escopo:** 100% JS → **OTA**, sem rebuild. `tsc` limpo.

**Fallback:** `git checkout v0.7.16`.

---

## v0.7.16 — "meio saco no cocho e bombona conferida na ronda" (2026-08-18)

### 1. Suplementação: meio saco e teto de 20

Pedido do campo: o peão frequentemente coloca **meio saco** no cocho, e em piquete grande passa de 10 sacos. O slider de "Quantos sacos colocou no cocho?" (Ronda › Suplementação, passo 4) só aceitava inteiros de 1 a 10. Agora vai de **0,5 a 20, de meio em meio** — no arraste, nos botões −/+ e na digitação direta.

**Sem migration.** `supplement_evals.sacks_in_trough` já era `REAL` no SQLite e `real` no Postgres. `calculateSupplementDays` multiplica sacos × kg e faz `Math.floor` no fim, então a previsão do cocho continua em dias inteiros.

**Decimal em pt-BR** (`src/components/ui/SliderInput.tsx`, `src/constants/index.ts`). Este é o primeiro uso de `SliderInput` com `step < 1` — o ramo fracionário nunca tinha renderizado e imprimia ponto (`1.5`), além de `3.0` para valor inteiro. Agora `toLocaleString('pt-BR', { maximumFractionDigits: 1 })` no número grande, nos rótulos das pontas e no valor que semeia o campo de edição: `1,5` e `3`. Novo helper `decimal()`; `sacos()` passou a usá-lo, o que corrige de quebra os pontos que já apareciam em saldos fracionários no Painel, Estoque, Reabastecimento e Relatório.

### 2. Bombona: o sistema diz quanto deveria ter, o peão confirma

A ronda de Bombona pedia a contagem no vácuo. Agora ela **mostra quanto deveria ter e pede confirmação** — e a resposta corrige o estoque.

**De onde sai o "deveria ter"** (`src/lib/bombona.ts`, novo). Do ledger da própria ronda:

```
deveria ter = saldo da última entrega − sacos que a Suplementação tirou desde então
```

`inventory` guardava só o que a rota **entregou** e nada nunca debitava: a Suplementação registra os sacos que vão pro cocho, mas esses sacos saem da bombona e ninguém subtraía. Por isso os saldos estavam parados em maio/julho. A conta acima fecha a lacuna sem precisar de evento novo no fluxo de Suplementação.

**Fluxo** (passos variam conforme as respostas): tem ração? → fórmula (cada uma mostra `sistema: N sacos`) → **confere?** → contagem real (só se discordar) → resumo. Fórmula sem registro na bombona pula a confirmação e cai na contagem, que é o fluxo antigo.

**A confirmação corrige o estoque.** Grava `inventory_events` do tipo `CONTAGEM_BOMBONA` com a diferença e re-ancora `last_resupply_date`. O evento é obrigatório porque no servidor `inventory.quantity_sacks` é derivado da soma do ledger (trigger `inventory_force_ledger`) — saldo "cru" pushado é ignorado. Avaliação e evento vão na mesma transação. Re-ancorar a data é o que impede o número de errar de novo no dia seguinte: sem isso a próxima ronda tornaria a descontar os abastecimentos antigos do saldo recém-corrigido. **"Não tem ração" zera todas as fórmulas da bombona daquele piquete**, não só a que seria escolhida depois.

**Ledger negativo é comum hoje e a tela avisa.** Nos dados de produção, P51 tem 5 sacos entregues em 25/05 contra 95 já registrados no cocho (−90); P50 dá −64 e T27 - P10, −15 — ração que veio direto do trator ou reabastecimento não registrado. Nunca mostramos negativo pro peão: o exibido é cortado em zero e a base aparece embaixo ("5 entregues em 25/05 · 95 foram pro cocho desde então"), com um aviso de que a contagem dele vai corrigir o estoque.

**Alerta do Painel passou a ler da mesma fonte** (`src/lib/alerts.ts`). Antes ele estimava o saldo restante por consumo do lote (`saldo − consumo diário × dias`), caminho diferente do da ronda — os dois discordariam sobre o mesmo piquete. Agora "quanto ainda tem" vem do ledger e só "quanto dura" continua vindo do consumo do rebanho.

**A contagem aceita meio saco** (0 a 20, passo 0,5): a projeção sai fracionária, então granularidade de saco inteiro tornaria a confirmação incoerente.

**Sem migration** aqui também — `bombona_evals.sacks` já é `REAL`, `inventory_events.event_type` não tem CHECK, e o relatório rotula tipos novos automaticamente.

### Escopo

100% JS, nenhuma superfície nativa tocada → **sai por OTA** (`eas update`), sem rebuild. `tsc` limpo. A SQL da projeção e a reconciliação foram validadas contra um SQLite real com os casos de produção (entrega anterior à ronda, abastecimento no dia da entrega, `restocked = 0`, piquete inativo, segunda fórmula na mesma bombona) e a reprojeção pós-contagem devolve a contagem em vez de descontar de novo.

**Limites conhecidos.** (a) Se a contagem divergir **e** a Bombona for feita antes da Suplementação **e** houver abastecimento no mesmo dia, aqueles sacos não entram na conta (a âncora é DATE, sem hora) — erra pra cima e a ronda seguinte corrige; detalhe do porquê em `src/lib/bombona.ts`. (b) Não há tela para desfazer uma contagem errada: `estoque/ajuste.tsx` só opera na central. O conserto hoje é outra ronda.

**Risco:** médio — é a primeira vez que a ronda escreve em `inventory`. A correção é sempre um evento, nunca um saldo cru.

**No ar (OTA, 2026-08-18):** runtime `1.0.1`, android+ios. Preview update group `88af753f-5ee0-4e15-80b1-ff94a9760b27` · production `afd10324-7acb-46ed-bc12-128c386f97b4`. Preview bateu no QA (env do `.env` local), produção usou o environment `production` do EAS.

**Fallback:** `git checkout v0.7.15` e republicar o bundle anterior com `eas update --branch production --environment production`.

---

## Dados — NSA2: 32 piquetes novos (2026-08-18)

Mudança de **dado**, não de código — sem versão, sem tag, sem build. Devices puxam no próximo sync.

Inseridos 32 piquetes `NSA2 - P01` … `NSA2 - P32` (761,58 ha) no Supabase de produção, a partir de `kml/NSA2 - piquetes, por lote.kml`. Áreas calculadas por shoelace em projeção equirretangular local (média 23,8 ha — coerente com os P77–P84 vizinhos); geometria GeoJSON `[lon, lat]`, anel fechado, 7 casas decimais (padrão dos existentes); `center_lat`/`center_lng` = centroide; tipo de capim **Braquiarão** (decisão do Lucas) para os 32.

**Correções de nome aplicadas na origem** (KML tinha dois fora do padrão): `NSA - P22` → `NSA2 - P22` e `NSA2 - 18` → `NSA2 - P18`. Com isso a sequência P01–P32 fecha sem buraco.

**Tiles:** o bbox do NSA2 (lng −45,3867..−45,3489 / lat −15,2143..−15,1786) cai **dentro** do bbox já empacotado. Verificados os 286 tiles (z12–z17) que cobrem a área: 0 faltando. Mapa offline funciona sem `fetch-tiles.mjs` nem APK novo.

**Pendências conhecidas:** (a) nenhum lote/rebanho alocado — o KML não traz essa informação, apesar do nome do arquivo; alocar via `/admin` quando o dado existir. (b) O prefixo `NSA2` reintroduz o padrão `NSA I`/`NSA II` que a v0.7.7 removeu dos 125 piquetes antigos; se a intenção for tratar como talhão, renomear para `Txx - Pxx` via `/admin/piquetes`. (c) `seed-map.ts` segue com 145 piquetes (Supabase: 203) — não afeta o app, só re-seed e cálculo de bbox.

**Fallback:** soft-delete — `UPDATE paddocks SET deleted_at = now(), updated_at = now() WHERE name LIKE 'NSA2 - %';` (sincroniza para os devices).

---

## v0.7.15 — "mapa no iPhone: tiles via bridge, nomes dos piquetes e GPS confiável" (2026-07-23)

Três problemas do mapa reportados no iPhone, com raiz comum investigada a fundo + revisão adversarial multi-agente (16 findings confirmados e corrigidos).

**1) Mapa todo verde no iOS — tiles agora via bridge base64** (`src/components/map/map-html.ts` novo + `FarmMap.native.tsx`). Dois defeitos empilhados: (a) o PNG 1×1 usado como `errorTileUrl`/"transparente" era na verdade um **pixel VERDE 50% de opacidade** (decodificado byte a byte) — quando todos os tiles falhavam, o mapa inteiro ficava verde; (b) no iOS, `<img src="file://...">` dentro de `source={{html}}` **não carrega** (sandbox do processo WebContent do WKWebView em documentos `loadHTMLString` — `allowFileAccess*` não resolve; Android não tem essa restrição, por isso só o iPhone quebrava). Agora a página pede cada tile por `postMessage` e o nativo responde com data URI base64 (`expo-asset` + `expo-file-system/legacy`), com retry nos dois lados. Mesmo caminho nos 2 OS; sem mais `Asset.loadAsync` de 2700 tiles no boot (mapa abre na hora). O HTML do Leaflet foi extraído pra `map-html.ts` (função pura) e validado num harness em Chrome headless com os polígonos e tiles reais.

**2) Nome do piquete no centro de cada polígono.** Label no centroide (shoelace), fonte dimensionada pelo espaço REAL disponível — corda horizontal/vertical do polígono no centroide (bbox superestimava em piquetes diagonais e o texto vazava a cerca), medição de largura real do texto, recalculada a cada zoom. Esconde abaixo de 11px (ilegível sob sol), teto 18px. `pointer-events:none` — não rouba o toque do polígono.

**3) GPS que sumia ao voltar de outro app.** Causa: iOS mata o processo do WKWebView em background → página recarrega sem o marker (e `reload()` não recupera `source={{html}}` — verificado empiricamente: o HTML string morre com o processo; a recuperação certa é REMOUNT via key, agora ligada em `onContentProcessDidTerminate` + `onRenderProcessGone` no Android). Última posição fica em ref e é re-injetada em `onLoadEnd` e no retorno do app (AppState). Botão de GPS agora sempre visível (56px), busca ativa a posição ao tocar (timeout 8s → fallback última conhecida → aviso "GPS indisponível"), e (re)inicia o watch se a permissão foi concedida depois de negada. Banner de GPS reposicionado (cobria o botão).

**Da revisão adversarial, ainda:** círculo de precisão do GPS engolia o toque de quem clicava na própria posição (deseleção fantasma — `interactive:false`); seleção fantasma após reload do WebView (`__setSelected` sempre injetado, mesmo null); nome de piquete contendo `</script>` derrubaria a página (escape `<`); separador `·` no popup (spec NSA).

**Dep nova:** `expo-file-system` (~19.0.23) como dependência direta — já era transitiva do core `expo`, módulo nativo já linkado em todo binário → **mudança 100% JS, sai por OTA** (runtimeVersion `1.0.1` fixa). Web: só corrigido o mesmo PNG verde.

**Conhecidos/não corrigidos:** botão ⟳ de refresh segue 30px (pré-existente, discreto por design); emergency launch do expo-updates no Android deixaria tiles transparentes (cenário raro, já era quebrado antes — só que verde).

**Como aplicar:** validar em Expo Go (Tab A9 + iPhone) → `eas update --branch preview` → validar → `eas update --branch production --environment production`. Sem rebuild.

**Risco:** médio (reescreve o pipeline de tiles do mapa nos 2 OS; Android funcionava via file:// e passa pro bridge). `tsc` limpo; página validada em harness com dados reais.

**Fallback:** `git checkout v0.7.14`.

---

## v0.7.14 — "sync idempotente: fim das rondas/avaliações duplicadas" (2026-06-08)

Correção da raiz da duplicação de rondas no Supabase (um piquete aparecia com "4 rondas" num dia de 1 visita só; piquetes verdes no mapa sem nenhuma avaliação; contadores inflados). Diagnóstico por forense de dados + auditoria multi-agente: **duas falhas se compondo, ambas = guarda não-atômica + ausência de chave de idempotência**. Não é regressão — defeitos latentes amplificados por volume + conexão CGNAT ruim no fim do dia 08/06 (+ backlog do dia 07 sem rondas).

**1) Push append-only idempotente** (`src/lib/sync/engine.ts`). O push de `rondas`/`*_evals`/`*_events` fazia `insert` puro: o servidor cunhava um UUID novo (`gen_random_uuid()`) e o `supabase_id` só voltava pro row local **após** sucesso. Qualquer execução dupla (resposta perdida no proxy, ou ciclos concorrentes) re-inseria com UUID novo — nada deduplicava. Agora geramos um UUID estável no device, gravamos em `supabase_id` **antes** do envio, e trocamos `insert` por `upsert(onConflict:'id')`. Um retry re-envia o mesmo id → colapsa no mesmo row. Sem migration (PK já é `uuid` client-supplyable; RLS OK pro mesmo usuário).

**2) Mutex de sync atômico** (`src/lib/sync/daemon.ts`). `tryRun` checava `state.running` mas só setava depois de um `await getSyncStatus` — janela TOCTOU em que poll/foreground/reconnect (ou o `forceSync` do login) rodavam `pushPending` concorrente sobre os mesmos rows `pending_sync=1`. Agora o lock é reivindicado **antes** de qualquer await (check-and-set atômico); todo early-return libera o lock.

**3) Uma ronda por (piquete, dia)** (`src/app/ronda/[paddockId]/menu.tsx`). `initRonda` fazia `SELECT`-depois-`INSERT` protegido só por um `useRef` por-instância que zerava no remount → dois renders criavam 2+ rondas locais (as "vazias"; a real ficava com a última). Trocado por um lock por chave em escopo de módulo, compartilhado entre remounts: um único INSERT por visita. Os dados confirmaram que **uma-ronda-por-dia é o invariante real** — zero re-visitas legítimas no histórico inteiro.

**Limpeza dos duplicados já no prod:** pendente, a fazer **depois** deste fix no ar (soft-delete reversível, SELECT-first), pra não re-poluir.

**Como aplicar:** OTA via `eas update --branch production` + `--branch preview`. Tudo JS/TS — `expo-crypto` já é dep nativa (build atual), sem prebuild. Validar QA (Expo Go no Tab A9) → APK preview → produção antes de promover.

**Risco:** médio (mexe no core do sync — offline-first é hard constraint). `tsc` limpo. Upsert é aditivo; rows antigas com `supabase_id` nulo seguem válidas. Mutex: cada early-return reseta o lock (senão trava até o watchdog de 60s). Validar no fluxo de 3 estágios antes de prod.

**Fallback:** `git checkout v0.7.13`.

---

## v0.7.13 — "fix data em Solicitações/Rebanho + limpeza de código morto + doc de arquitetura" (2026-05-30)

Release de manutenção: um fix user-visible, faxina de código morto (auditada e verificada por multi-agente) e doc nova. Também **commita o código da v0.7.11** (anomalia "Ronda sem gado") que estava no working tree sem nunca ter sido versionado — o CHANGELOG já a descrevia, mas o código não existia em nenhum commit.

**1) Fix: formato de data quebrado.** Novo `src/lib/dates.ts` (`formatDayMonth`) consolida dois `formatDate` divergentes (`(tabs)/ronda.tsx` e `admin/solicitacoes.tsx`). A versão antiga não removia a hora de timestamps do SQLite (separador é espaço, não `T`), exibindo "Criada 30 08:34:03/05" em vez de "30/05". Agora usa `split(/[T ]/)` — mesmo padrão de `loadLastEvals`.

**2) Limpeza de código morto** (auditoria multi-agente com verificação adversarial). Removidos: `classifyFence` (morto — `classifyFenceWith` o substitui), função `pullOne` duplicada em `engine.ts`, import `SafeAreaView` não usado em `mapa.tsx`, deps `nativewind`+`tailwindcss` (sem config/uso) e 8 scripts `test-*.mjs` one-off. `console.*` dos 7 summaries de ronda guardados em `if (__DEV__)`.

**3) Doc de arquitetura.** `docs/ARQUITETURA-E-DADOS.md` (auto-importado no CLAUDE.md): fonte de verdade (Supabase), como o sync funciona, toolchain de scripts e runbooks. Inclui a reorganização pendente do CLAUDE.md.

**4) Confinamento.** 20 piquetes CF1–CF20 (tipo de capim "Confinamento") inseridos no Supabase — aparecem no mapa/listas via sync. Dado, não bundle; cobertos pelos tiles já empacotados.

**Como aplicar:** OTA via `eas update --branch production` + `--branch preview`. Tudo JS/TS — sem build nativo. Devices baixam na próxima abertura.

**Risco:** baixo. Fix de data verificado (tsc + 3 formatos de entrada). Remoções verificadas adversarialmente + bundle Android compilou limpo. A feature anomaly já estava no bundle validado em QA (Expo Go no Tab A9).

**Pendência de segurança (fora deste release):** a senha hardcoded nos scripts `test-*.mjs` removidos continua no histórico git — rotacionar no Supabase.

**Fallback:** `git checkout v0.7.12`.

---

## v0.7.12 — "estoque: filtrar formulações inativas + tab bar não cola na nav do Android" (2026-05-22)

Dois ajustes user-visible reportados pelo Lucas com base em uso real no Tab A9:

**1) Estoque oculta formulações desativadas.** `(tabs)/estoque.tsx` listava qualquer formulação que tivesse linha em `inventory` (mesmo com `formulas.active=0`), poluindo a aba Central com itens descontinuados. Adicionado `AND f.active = 1` nas 3 queries (centralTotals, bombonaItems, bombonaTotals). Aba Admin → Formulações segue mostrando inativas pra permitir reativar.

**2) Labels da tab bar colando na barra do Android.** `(tabs)/_layout.tsx` usava `paddingBottom: 8 + insets.bottom`, mas em alguns Androids com edge-to-edge + 3-button nav o `insets.bottom` retorna 0 — labels ficavam a 8px do system nav. Floor com `Math.max(insets.bottom, 16)` garante mínimo de respiro mesmo quando o inset não é detectado corretamente.

**Como aplicar:** OTA via `eas update --branch production` + `--branch preview`. Mudança puramente JS/TS.

**Risco:** baixíssimo. Filtro SQL aditivo (não muda dado). Tab bar só ganha padding extra, lógica preservada.

**Fallback:** `git checkout v0.7.11`.

---

## v0.7.11 — "mapa: piquetes rondados sem gado em laranja (anomalia)" (2026-05-14)

Melhoria de visibilidade no modo Ronda do mapa. Lucas reportou: Rafa fez 13 rondas hoje, mas o contador do mapa mostrava só "7 / X hoje". Investigação confirmou que **não é bug** — são definições diferentes: o Relatório conta rows na tabela `rondas` (13), o mapa contava só **piquetes com gado** que tiveram ronda hoje (7). Os 6 que sumiam eram rondas feitas em piquetes sem gado alocado (`total_heads = 0`), filtradas pelo `paddocks.filter(p => p.total_heads > 0 && p.has_ronda_today)` em `mapa.tsx:82`.

Esses 6 piquetes representam **anomalia real**: ou o gado saiu sem registrar a desalocação, ou o peão rondou piquete vazio sem motivo. Antes ficavam cinza (`empty`) e o admin não tinha como notar pelo mapa.

**Mudança:** novo estilo `anomaly` (laranja `#b88217` sobre stroke `#7a550f`, usando tokens `NSA.warn`/`warnFg` do design system) em `PADDOCK_STYLES`. Pintado quando `mode === 'ronda' && !hasCattle && has_ronda_today`. No selected bar do piquete, `StatusPill` adicional com label "Ronda sem gado" (kind warn). Contador "X / Y hoje" continua medindo só piquetes com gado — escopo do contador é cobertura do rebanho, não de rondas brutas.

**Como aplicar:** OTA via `eas update --branch production` + `--branch preview`. Mudança puramente JS/TS, sem impacto nativo.

**Risco:** baixíssimo. Adiciona uma cor; lógica antiga preservada pros estados existentes (`active`, `pending`, `empty`).

**Fallback:** `git checkout v0.7.10`.

---

## v0.7.10 — "fix crítico: heal de herd não soma mais head_counts (gado fantasma)" (2026-05-11)

Bug **crítico de integridade de dados** detectado em produção pelo Gabriel: contagem de gado aumentou "sozinha" em P19A. Auditoria confirmou: P19A GARROTE = 214 cab, mas o log de `herd_events` só tinha **uma** transferência de 107 cab pra aquele piquete. Exatamente **DOBRO**. +107 cab fantasmas.

**Causa raiz:** `tryHealOrphan` em `app/src/lib/sync/engine.ts:391` (introduzido na v0.7.8) somava `head_count` local + remoto quando dois INSERTs do mesmo `(paddock_id, category)` chegavam ao Supabase (UNIQUE violation). Cenário disparado quando a mesma operação roda em 2 devices offline (ou em retry pós-falha): cada device cria localmente uma row com `head_count=qty` e empurra. 1º push cria a row com qty. 2º push bate em UNIQUE → heal somava `qty + qty = 2×qty`. Sem barulho, sem dedup, gado dobrado.

Os comentários em `alocar.tsx:126` e `desalocar.tsx:125` já mencionavam a duplicação como conhecida ("não deletar rows com head_count=0 — sync faz INSERT e duplica via heal"), mas o caso de mover-rebanho criando piquete novo não era coberto por essa mitigação.

**Sintoma:** rows em `herd` aparecem com head_count maior que a soma dos eventos. Evidência de operação duplicada visível no log de `herd_events` (2 rows idênticas com mesmo timestamp) quando o caminho de UPDATE protegeu a tabela, mas não no caso de INSERT em row nova.

**Fix:** o heal para `herd` deixa de somar e passa a tratar a row local órfã como REDUNDANTE — deleta local, reseta `last_pull_at`, próximo pull baixa a versão canônica do servidor. Idempotente. Logs ganham nível `warn` com contagens local/remoto pra investigação manual quando divergir (cenário raro de 2 peões realmente alocando em paralelo).

**Limpeza em produção:** UPDATE manual via script `app/scripts/fix-p19a-ghost.mjs`: P19A GARROTE 214 → 107. Total geral cai de 4.192 → 4.085 cab. Audit revisa snapshot pós-fix.

**Scripts novos (mantidos no repo pra auditoria futura):**
- `app/scripts/history-herd.mjs <user> <pass> [yyyy-mm-dd]` — extrai histórico de herd_events + rows modificadas em XLSX
- `app/scripts/probe-paddock.mjs <user> <pass> <names csv>` — investiga discrepância simulando saldo dos eventos
- `app/scripts/fix-p19a-ghost.mjs <user> <pass>` — correção pontual (idempotente, aborta se já corrigido)

**Como aplicar:** OTA via `eas update --branch production` + `--branch preview`. Devices baixam na próxima abertura.

**Risco:** baixo. Mudança cirúrgica (~10 linhas no heal de herd). Cenário de "perda de dado por delete" exigiria 2 peões alocando paralelamente o mesmo (piquete, categoria) — caso raro e que produz log warn audível.

**Fallback:** `git checkout v0.7.9` (mas isso traz de volta o bug do gado fantasma).

---

## v0.7.9 — "fix: heal de órfãs em app_settings também em RLS error (peões)" (2026-05-06)

Bug de UX descoberto na fazenda: peões viam "21 pra subir · toque pra sincronizar" no Painel e o contador **nunca caía pra 0**, mesmo com sync rodando e empurrando rondas/evals normalmente. Investigação E2E com Rafael: contador travado, log do device com 21 `push_insert_rls` em loop em `app_settings` (localId 1..21).

**Causa raiz:** v0.7.8 fez `app_settings` virar tabela sincronizada e adicionou `tryHealOrphan` pra cobrir o caso "admin pré-populou no Supabase, peão tem cópia local com `INSERT OR IGNORE`". O heal só disparava em `error.code === '23505'` (UNIQUE violation). Mas a política `app_settings_ins` no Supabase é `with check (is_admin())` — pra peão, o INSERT é rejeitado **antes** de chegar no UNIQUE, com erro RLS (`42501`). Heal nunca rodava → 21 rows ficavam presas em `pending_sync=1` indefinidamente. Admins (lucas, alex, gabriel) não viam o bug porque `is_admin()` passa, INSERT chega no UNIQUE check, heal funciona.

**Sintoma para o usuário:** contador "X pra subir" travado em 21+ permanentemente para qualquer peão. Outras tabelas (rondas, evals, herd_events, etc.) sincronizavam normais — o engine itera por tabela em `pushPending` e não bloqueia. Só o ruído visual no Painel.

**Fix:** `app/src/lib/sync/engine.ts` no caminho de INSERT — quando o erro é RLS **e** a tabela é `app_settings`, também tenta `tryHealOrphan`. O heal já valida via SELECT que a row existe no servidor (peão tem `app_settings_read` autorizado: `using (auth.role() = 'authenticated')`), então é seguro deletar a órfã local. Próximo pull traz a versão do servidor com `supabase_id` e `pending_sync=0`.

**Como aplicar:** OTA via `eas update --branch production` + `--branch preview`. Devices baixam na próxima abertura do app. Primeiro ciclo pós-update: peão limpa as 21 órfãs (~10s, 21 round-trips), contador zera. Ciclos seguintes: zero round-trips em app_settings (rows não estão mais com `pending_sync=1`).

**Risco:** baixo. Mudança cirúrgica de ~5 linhas no engine, segue padrão existente do branch UNIQUE. Sem migração de schema, sem mudança de RLS no servidor.

**Fallback:** `git checkout v0.7.8` se precisar reverter; órfãs voltam mas sync de rondas continua ok.

---

## v0.7.8 — "app_settings sincronizada — alertas valem pra todos os devices" (2026-04-30)

Configurações da tela `/admin/alertas` (ligar/desligar alerta de bombona, central, sanidade, água, cerca, desalocados, biológico — e os thresholds de cada) deixam de ser **locais por device** e passam a sincronizar via Supabase. Antes desse fix, admin desligava no Tab S9 e peões no campo continuavam vendo todos os alertas.

**Causa raiz:** `app_settings` no `app/src/lib/db/schema.ts` era uma tabela puramente local — não tinha colunas SYNC, não estava em `SYNCED_TABLES`, não tinha equivalente no Supabase. Cada device mantinha seu set independente.

**Fix de schema:**
- Bump `SCHEMA_VERSION 21 → 23` em `app/src/lib/db/provider.tsx`. Migration v22 dropa `app_settings` local; v23 dropa de novo (PK mudou — ver abaixo). Recriada com colunas SYNC. Defaults voltam pelo `INSERT OR IGNORE` no schema, depois pull do Supabase sobrescreve com valores reais do servidor.
- `app_settings` adicionado a `SYNCED_TABLES` (`appendOnly: false`, sem FKs) e a `MUTABLE_TABLES` (gera trigger `tg_app_settings_mark_dirty` que marca `pending_sync = 1` em UPDATEs locais).
- **PK mudou de `key` para `id INTEGER AUTOINCREMENT`** (com `key` ainda UNIQUE). O sync engine assume `WHERE id = ?` em todas as tabelas SYNCED — esse era o bug do `Error code 1: no such column: pending_sync` que quebrava o sync inteiro. `settings.ts` continua usando `key` (UNIQUE constraint preserva semântica).
- `tryHealOrphan` em `app/src/lib/sync/engine.ts` ganha branch pra `app_settings`: quando o INSERT no Supabase volta 409 (UNIQUE em `key`), deleta a row local órfã e reseta `last_pull_at` pra trazer a versão do servidor com `supabase_id`. Padrão alinhado com `grass_types`/`formulas`.

**Fix de produção:**
- Nova tabela `public.app_settings` no Supabase via `app/supabase/migrations/2026-04-30_app_settings_sync.sql`: `id UUID PK`, `key TEXT UNIQUE`, `value TEXT`, `created_by`, `updated_at` auto via trigger.
- RLS: `SELECT` livre pra qualquer authenticated (peões precisam ler thresholds pra avaliar), `INSERT/UPDATE/DELETE` só pra admins (via `is_admin()`).
- `INSERT OR IGNORE` dos 21 defaults — idempotente. Se um admin já configurou antes do flip, valor preservado.

**Como aplicar:** rodar a migration SQL no SQL Editor do Supabase. Devices puxam na próxima sync. `setSetting()` no `app/src/lib/settings.ts` continua igual (UPSERT por key); o trigger novo dispara e propaga.

**Conflict resolution:** last-write-wins via `updated_at`, padrão do engine. Se 2 admins editarem ao mesmo tempo (raríssimo), o último ganha.

**Risco:** baixo. Tabela isolada, sem FK pra outras. Migration idempotente.

**Fallback:** `git checkout v0.7.7` + drop da tabela `app_settings` no Supabase se precisar reverter.

---

## v0.7.7 — "Padronização de nomenclatura de piquetes (Txx - Pxx) + T12 + admin rename" (2026-04-29)

Re-organização da nomenclatura de todos os piquetes para o padrão `Txx - Pxx`, adição do talhão T12 (20 piquetes novos) e nova tela admin pra renomear piquetes diretamente do app.

**Decisões de produto (Lucas):**
- Remover o prefixo `NSA I` / `NSA II` de todos os 125 piquetes existentes — não é mais necessário.
- Os 71 com talhão (T27/T32/T34/T35) viram `Txx - Pxx`.
- T27 e T34 foram **renumerados** conforme planilha do coordenador da pecuária (`kml/MUDANÇA DE PASTO SISTEMA DO LUCAS.xlsx`). Ex: `NSA II P28B - T27` → `T27 - P01`.
- T32 e T35 mantiveram a numeração original — apenas perderam o prefixo. Ex: `NSA I P05 T35` → `T35 - P05`.
- Os 54 sem talhão também perdem o prefixo, mas continuam sem `Txx`. Ex: `NSA I P11A` → `P11A`. Caso especial: `NSA I P08 - P32` (typo que não foi corrigido na origem) virou `P08`.
- T12: 20 piquetes novos do KMZ `kml/T12 - pastos.kmz`. Normalizei espaçamento (KMZ misturava `T12-P01` e `T12 - P03`) e corrigi typo do KMZ (`P12 - T06` → `T12 - P06`).

**Tela admin nova — `/admin/piquetes`:**
- Lista todos os piquetes ativos com busca por nome.
- Tap abre modal pra editar o `name` (apenas — area/geometry vêm do KML).
- Bloqueia duplicata local, salva via `UPDATE paddocks SET name = ?`. Trigger `tg_paddocks_mark_dirty` (já existente, paddocks em `MUTABLE_TABLES` desde antes do v0.7.5) marca `pending_sync = 1` → push automático ao Supabase no próximo ciclo.
- Acesso: bloqueado pra `peao` via `app/src/app/admin/_layout.tsx` (role gate já existente).

**Pipeline de seed:**
- `kml-to-seed.mjs` agora não pré-pendea o "Retiro" no nome (era de onde vinha "NSA I"/"NSA II"). Com isso, o `<name>` do KML mestre é fonte da verdade direta.
- KML mestre (`kml/Fazenda NSA - Pastos v5.kmz`) atualizado com os 145 placemarks (125 renomeados + 20 T12 novos). Backup em `Fazenda NSA - Pastos v5.kmz.bak`.
- `app/src/lib/db/seed-map.ts` regenerado — fresh installs já saem com os nomes novos.

**Migration SQL gerada (não aplicada ainda):**
- `app/supabase/migrations/2026-04-29_padronizar_piquetes_v2.sql` — 125 UPDATEs + 20 INSERTs.
- Aplicação em produção fica **bloqueada até validação local** (Lucas testa a tela admin no Expo Go com 1-2 renames manuais; quando OK, autoriza eu rodar a migration completa via REST/SQL Editor).

**Risco/blast radius:**
- Sem alteração de schema. `paddocks.name` é text mutável; nenhuma FK depende do nome (todas usam `paddock_id`).
- Devices em produção não percebem mudança até a migration ser aplicada no Supabase + sync engine puxar.
- Rondas em andamento durante o flip: o id persiste, só o display name muda — nenhum dado quebra.

**Fallback:** `git checkout v0.7.6` + restaurar `kml/Fazenda NSA - Pastos v5.kmz.bak` se precisar reverter o KML mestre.

---

## v0.7.6 — "Bugs encontrados na primeira semana de produção" (2026-04-29)

Auditoria a partir do uso real do Rafael (peão novo, 17 avaliações em ~17 piquetes no dia 29/04). Quatro bugs identificados, três fixes locais (OTA via EAS Update) + um fix de UX:

**1. Race em `initRonda` gerava 2-6 rondas duplicadas no mesmo dia/piquete/peão.**
- Causa: `useEffect` em `app/src/app/ronda/[paddockId]/menu.tsx` disparava em cascata (dep era objeto `user`, recriado em cada hidratação do authStore). Entre o SELECT "tem ronda hoje?" e o INSERT "criar ronda", a segunda invocação do effect entrava no mesmo branch SELECT-vazio → INSERT/INSERT em paralelo.
- Sem `UNIQUE INDEX` em `rondas(paddock_id, user_id, date)`, o banco aceitava todas (Rafael acabou com 6 rondas no P75 em 1 dia).
- Fix: dep mudou pra `user?.id` (string estável) + `useRef` guardando promise da chamada em vôo. Sem mudança de schema (decisão de produto: não fazer cleanup das duplicatas atuais — risco baixo de não fazer; novas duplicatas são bloqueadas).

**2. Suplementação salva 2× na mesma ronda quando peão re-entra no fluxo.**
- Cenário real do Rafael: às 13:49 e às 14:11 ele finalizou a Suplementação do P50 com valores idênticos (1 saco Probeef Reprodução cada). Mesma ronda, dois `supplement_evals`. Possível double-tap acidental ou volta ao fluxo pra revisar.
- O caso do "voltei à tarde e reabasteci de novo" é legítimo — 2 reposições reais no mesmo dia. UPSERT cego apagaria histórico real.
- Fix UX: `app/src/app/ronda/[paddockId]/menu.tsx` agora detecta se já existe eval do tipo X na ronda atual e pede confirmação antes de re-entrar no wizard ("Já avaliada hoje · Fazer nova / Cancelar"). Preserva ambos os caminhos. Usa o helper `confirm` cross-platform existente.

**3. KPI "Rondas hoje" mostrava 0 quando peão fez avaliações reais.**
- Antiga regra em `app/src/lib/alerts.ts`: ronda só contava com ≥2 tipos diferentes de eval. Rafael fez só Suplementação em 17 piquetes → contador = 0. Mensagem desonesta no painel do admin.
- Nova regra: separação **completas** vs **incompletas**.
  - Completa = piquete com Gado teve hoje as 3 obrigatórias avaliadas (Suplementação + Aguada + Cerca).
  - Incompleta = piquete teve ≥1 obrigatória mas falta alguma. Mostrado em hint separado.
- Mapa permanece como estava (qualquer ronda existente conta — combinado com o user pra preservar overview rápido).
- Coluna morta `rondas.completed` no schema continua existindo mas sem uso — evitamos mexer (decisão de produto: risco baixo, futuro PR).

**4. Mapa: tocar fora de polígonos não deselecionava o piquete (só nativo).**
- O JS do Leaflet em `FarmMap.native.tsx` emitia `{ type: 'select', id: null }` no `map.on('click')`, mas o handler `onMessage` filtrava com `typeof msg.id === 'number'` e descartava o `null`. Web já funcionava (handler dedicado `DeselectOnMapClick`).
- Fix: aceita `id` numérico OU `null` no `onMessage` da WebView.

**Risco:** baixo. Tudo é JS/TS, sem mudança de schema, sem nova permissão nativa. Mudanças confinadas a 4 arquivos. Triagem via Expo Go (Tab A9) → APK preview → produção (manual, com autorização explícita).

**Fallback:** `git checkout v0.7.5`.

---

## v0.7.5 — "Fix sync de resupply_routes/loads (rota fantasma)" (2026-04-27)

Bug encontrado em produção: rota de reabastecimento finalizada localmente NUNCA era pushada pro Supabase. Sintoma: banner "Rota de reabastecimento em andamento" ressuscitava após cada ciclo de sync.

**Causa raiz auditável:**
- `resupply_routes` e `resupply_loads` estavam em `SYNCED_TABLES` como `appendOnly: false` (sinalizando que recebem UPDATEs), mas **NÃO** estavam em `MUTABLE_TABLES` no `app/src/lib/db/schema.ts`.
- `MUTABLE_TABLES` é a fonte usada pra gerar os triggers `CREATE TRIGGER tg_<table>_mark_dirty AFTER UPDATE` que setam `pending_sync = 1` em mudanças locais.
- Sem trigger: `UPDATE resupply_routes SET status='completed'` em `resumo.tsx` deixava `pending_sync = 0` (default pós-INSERT-sincronizado).
- Engine de push filtra por `WHERE pending_sync = 1` → mudança nunca saía do device.
- Pull subsequente trazia versão remota (`status='in_progress'`) — fix de "skip se pending_sync=1" não protegia porque pending_sync era 0 → engine sobrescrevia local com `in_progress` → banner ressuscitava.

**Evidência empírica (Supabase Dashboard, S9 do Lucas):**
- Rota `08516eba-9176-49fc-8335-958ac895655a` em `in_progress` há 4.41h, dono = Lucas (admin), `created_by = auth.uid()` correto. RLS não rejeitava — app simplesmente nunca tentava o UPDATE no servidor.

**Fix:**
```diff
 const MUTABLE_TABLES = [
   'grass_types', 'formulas', 'paddocks', 'water_tanks', 'farm_boundaries',
   'herd', 'inventory', 'inspection_requests',
+  'resupply_routes', 'resupply_loads',
 ];
```

Triggers passam a ser criados no próximo boot do app via `CREATE TRIGGER IF NOT EXISTS` em `CREATE_TABLES_SQL`. Sem migration de schema (não muda colunas, só adiciona trigger). EAS Update OTA suficiente — sem rebuild.

**Cleanup pra rota fantasma já existente:** SQL manual no Supabase que fecha a rota + devolve sobras ao central + insere `inventory_events` de auditoria. Necessário porque o trigger só captura UPDATEs feitos a partir do boot pós-update — mudanças anteriores ficaram com `pending_sync=0` permanente.

**Regra reforçada (vai pra CLAUDE.md):** sempre que adicionar uma tabela `appendOnly: false` em `SYNCED_TABLES`, **obrigatoriamente** adicionar em `MUTABLE_TABLES` também. Sem isso, a sync de UPDATE é silenciosa-quebrada.

**Fallback:** `git checkout v0.7.4`.

---

## v0.7.4 — "Cloudflare Worker proxy: contorna roteamento Cloudflare zoado" (2026-04-27)

Investigação iterativa via ADB no Galaxy Tab S9 do user identificou causa raiz: certos IPs Cloudflare (range `104.18.x.x` e `1.1.1.1`) têm TCP/443 silenciosamente dropado em algum hop entre device e Cloudflare nessa rede específica ("grupo menegueti", operadora local com CGNAT). Outros IPs Cloudflare (`172.64.x.x`, `172.67.x.x`) funcionam normalmente do mesmo device. Mesmo problema reproduzia: do PC funciona pro 104.18.38.10, do S9 não — sintoma de roteamento anycast/peering BGP que distribui IPs diferentes pro mesmo cliente baseado em fingerprint do device.

Solução: **proxy Cloudflare Worker** (`nsa-supa.lucas-cf1.workers.dev`) entre app e Supabase. Apenas mudança de `.env`:

```diff
- EXPO_PUBLIC_SUPABASE_URL=https://fxtescythawmbwkthbyb.supabase.co
+ EXPO_PUBLIC_SUPABASE_URL=https://nsa-supa.lucas-cf1.workers.dev
```

Worker (~10 linhas JS) faz passthrough transparente preservando method/headers/body — auth, REST, RPC, storage, realtime WebSocket. Worker resolve pra IP Cloudflare estável (`172.67.x.x`) que o device alcança, e fala com Supabase via backbone interno Cloudflare sem passar pela CGNAT do operador local.

**Validação empírica (via ADB direto no S9 conectado em "grupo menegueti"):**
- Antes (Supabase direto, IP `104.18.38.10`): TCP/443 timeout 5s, login app trava 15s exatos.
- Depois (Worker, IP `172.67.172.202`): TCP/443 conecta em 170ms.

**Custo/limites:**
- Cloudflare Workers free tier: 100k requests/dia. Folga >>3× pra 30 peões.
- Latência adicional: +400-600ms por request (do PC, sem CGNAT). Imperceptível em uso real.
- Mantém SLA do Supabase intacto — Worker falha aberto se Supabase cair.

**Trade-offs aceitos:**
- Logs de debug ficam centralizados no Cloudflare Dashboard (não no Supabase). Não atrapalha — `/admin/logs` do app continua autoritativo.
- Worker URL fica acoplada ao subdomínio `*.workers.dev` da conta `lucas-cf1`. Se um dia migrar de conta, atualiza `.env` + rebuild.

**Não é fix de código RN/JS** — `client.ts` e `authStore.ts` permanecem com timeout 25s + retry da v0.7.3, que continua sendo proteção de defesa em profundidade pra outras instabilidades.

**Fallback:** `git checkout v0.7.3` (volta apontar pro Supabase direto). Mantém funcional em redes onde Cloudflare anycast não é problema.

---

## v0.7.3 — "Resiliência de rede + auditoria de login" (2026-04-27)

Investigação ao usuário reportar `Conexão instável. Tenta de novo.` sempre que conectado na rede Wi-Fi "Grupo Menegueti" (~15s exatos antes do erro, request nunca chegava no Supabase). Diagnóstico fechado em **timeout do AbortController** + **firewall/MTU** dropando handshake TLS. Aplicadas 3 mitigações defensivas no cliente:

**Retry automático no `offlineSafeFetch`** (`app/src/lib/supabase/client.ts`):
- Antes: 1 tentativa, timeout 15s, sem retry. Auth/RPC abortavam silenciosamente em redes com flap de NAT, MTU baixo, ou inspeção SNI.
- Agora: até 2 tentativas com 1.5s de backoff entre elas. Auth e RPCs do Supabase são idempotentes — sem risco de mutação dupla.
- Timeout subiu de **15s → 25s** por tentativa. Total: até 50s + 1.5s de backoff antes de devolver 503.
- Resposta sintética 503 ganhou body diagnóstico: `{ error, message, name, duration_ms, url }`.

**Log mais detalhado em `auth:login_timeout`/`login_failed`** (`app/src/stores/authStore.ts`):
- Antes: só `{ username, error: msg }`.
- Agora: `{ username, error, name, status, duration_ms }`. Permite distinguir nos logs:
  - **`duration_ms ≈ 25000-26500`** + `name: AbortError|AuthRetryableFetchError` → handshake travado, suspeita firewall/MTU.
  - **`duration_ms < 3000`** + `error: Network request failed` → DNS não resolveu ou conexão recusada.
  - **`duration_ms < 5000`** + `status: 4xx/5xx` → servidor respondeu mas com erro real.

**Mensagem de erro mais útil** (mesma localização):
- Antes: `"Conexão instável. Tenta de novo."`
- Agora: `"Conexão instável. Essa rede pode estar bloqueando o servidor. Tente outra rede (4G) ou fale com TI."`

**Não é fix da causa raiz** — o problema continua sendo do roteador da rede em questão (firewall, MTU, ou DNS interno). Mitigações reduzem incidência (retry pega flap), aumentam tempo útil (timeout maior), e tornam diagnóstico futuro auditável (log granular). Próxima ocorrência do erro vai ter dados suficientes em `/admin/logs` pra fechar A vs C sem ping manual.

**Fallback:** `git checkout v0.7.2`.

---

## v0.7.2 — "QA E2E pré-produção: 4 fixes" (2026-04-26)

Auditoria E2E completa via Playwright (Ronda + Rebanho + Estoque + Reabastecimento) antes de subir pra Google Play / App Store. Conta de inventário fechou (1154 → 1176, net +22 das operações administrativas). Sync OK em todas as tabelas. 4 bugs encontrados, todos corrigidos:

**Fix 1 — Data quebrada nos tiles do menu do piquete** (`app/src/app/ronda/[paddockId]/menu.tsx:111`)
- Sintoma: tile mostrava `"Últ. 26 22:54:05/04"` em vez de `"Últ. 26/04"`.
- Causa: `created_at.split('T')[0] ?? created_at.split(' ')[0]` — o operador `??` nunca caía no fallback porque `split('T')` SEMPRE retorna array não-null. Quando `created_at` vem como `"2026-04-26 22:54:05"` (formato SQLite local), o split por T retorna a string inteira, e o split por `-` produz a parte com tempo agarrado.
- Fix: `created_at.split(/[T ]/)[0]` — pega só a data em qualquer formato.

**Fix 2 — Double-submit em ajuste manual de estoque** (`app/src/app/estoque/ajuste.tsx`)
- Sintoma (sério, corrupção): clicar 2× rápido em "Registrar perda · 4 sacos" decrementava 8 sacos e criava 2 inventory_events.
- Causa: `setSaving` é restaurado a `false` no finally (pré-Alert OK), permitindo segundo clique. `Alert.alert` no web é não-bloqueante.
- Fix: `submittingRef = useRef(false)` checado no início, igual ao pattern já existente em `entrada.tsx`.

**Fix 3 — Cancelar rota não funcionava no web** (`app/src/app/reabastecimento/rota.tsx` + novo helper `app/src/lib/confirm.ts`)
- Sintoma: clicar "Cancelar rota" no header não abria modal; `cancelActiveRoute` nunca era chamado.
- Causa: `Alert.alert` com array de buttons não renderiza modal no `react-native-web@0.21`. Bug encadeado (Alert dentro de onPress de Alert) deixava admin web travado com sacos no trator.
- Fix: novo helper `confirm()` que detecta `Platform.OS === 'web'` e usa `window.confirm` no web (Alert.alert no nativo). Aplicado nos 2 níveis de confirmação. Funciona em ambos os runtimes.

**Fix 4 — Bombona oculta fórmula desativada com saldo** (`app/src/app/ronda/[paddockId]/bombona/step2.tsx`)
- Sintoma: piquete com produto desativado armazenado na bombona ficava sem opção pra registrar avaliação.
- Causa: `WHERE active = 1` filtrava fora qualquer fórmula descontinuada, mesmo com saldo positivo em `inventory`.
- Fix: `WHERE active = 1 OR id IN (SELECT formula_id FROM inventory WHERE quantity_sacks > 0)`.

**Fixes adicionais (cosmético):**
- Removido emoji `✓` do summary de Lavagem (`washing/summary.tsx`) — quebrava regra do design system NSA "proibido emoji em UI navegável".
- `SliderInput` ganhou prop `unitSingular` opcional. `supplement/step4.tsx` e `bombona/step3.tsx` passam `unitSingular="saco"` — corrige "1 sacos" → "1 saco" no display do slider.

**Migration de reset estendida** (`2026-04-26_reset_pra_producao.sql`):
- Limpa fórmulas de teste E2E (`name LIKE 'E2E TEST%'`) e seus inventories antes de zerar o resto. Idempotente.

**Test summary (E2E):**
- ✅ Ronda completa (9 seções) num piquete: cada Finalizar volta pro menu, tile atualiza pra "Últ. DD/MM" (após fix 1), 0 erros de console, 0 falhas de sync.
- ✅ Rebanho: mover gado, alocar/desalocar, nascimento, morte, venda, evolução, lotação. Total preservado em todas as operações.
- ✅ Estoque + Reabastecimento 3 fases: entrada → ajuste → carregar → distribuir → resumo → cancelar. Conta fecha em todas as transições.
- 0 erros de sync (RLS, push_failed) durante todo o teste.

**Fallback:** `git checkout v0.7.1`.

---

## v0.7.1 — "Multi-select piquetes + voltar pro menu + reset pra produção" (2026-04-26)

Iteração rápida sobre v0.7.0. Foco: ajustes de UX no fluxo de solicitações + preparar a base pra subir em produção.

**Multi-select de piquetes em solicitações** (`app/src/app/admin/solicitacoes.tsx`):
- `selectedPaddockId: number | null` virou `selectedPaddockIds: Set<number>`. Cada chip de piquete é um toggle independente. Loop de save: N piquetes × N tipos. `createRequest` segue idempotente em pending — repetir a mesma combinação não duplica. Atalho "Marcar todos / Limpar" respeitando o filtro de busca.

**Botão voltar do menu do piquete** (`app/src/app/ronda/[paddockId]/menu.tsx`):
- `onBack` do `BrandHeader` agora faz `router.replace('/(tabs)/ronda')` direto. Resolve o histórico inconsistente que sobrava após o `router.replace` do summary pro menu (a stack ficava com steps do wizard pendurados — back podia levar pra step6 em vez da lista). Agora é determinístico: menu → lista de piquetes → Painel (pelo padrão da tab nav).

**Reset pra produção** (`app/supabase/migrations/2026-04-26_reset_pra_producao.sql` + bump local v21):
- Migration Supabase zera `inspection_requests`, `resupply_*`, todos os `*_evals`, `rondas`, `inventory_events`, `herd_events`. Reseta `herd` pros valores iniciais documentados em `seed.ts` (lookup de `paddock_id` por `name`, snapshot 2026-04-17). Reseta `inventory` central pros valores iniciais (734 sacos Topmost Golden + 400 Reprodução, demais zeradas) e apaga todas as bombonas. Idempotente.
- **Mantém intactos:** `profiles`, `paddocks`, `water_tanks`, `farm_boundaries`, `grass_types`, `formulas` (catálogos).
- App local: `SCHEMA_VERSION` 20 → 21, dropa tabelas de movimento + `herd`/`inventory`/`sync_state`. Quando o app reabrir, faz pull completo do Supabase já resetado.
- **Como aplicar:** rodar a migration no SQL Editor do Supabase **antes** de subir o build. Aparelhos com app aberto vão receber o repull no próximo ciclo de sync ou no próximo login.

**Fallback:** `git checkout v0.7.0`.

---

## v0.7.0 — "Camadas de usuário + solicitações sob demanda" (2026-04-26)

Modelo de papéis ganha uso real na UI. Fluxo de ronda passa a permitir emendar avaliações no mesmo piquete sem voltar pra lista. Avaliações categorizadas em **Obrigatórios** (Suplementação, Aguada, Cerca) e **Sob demanda** (Bombona, Forragem, Biológico, Sanidade, Peso visual, Lavagem). Admin pode delegar quais piquetes precisam de inspeção sob demanda; peão vê tudo destacado no Painel + tile do piquete; conclusão é automática quando o peão preenche aquela seção.

**Schema v20** (`app/src/lib/db/schema.ts` + `supabase/migrations/2026-04-26_inspection_requests.sql`):
- Nova tabela `inspection_requests` (paddock_id, eval_kind, requested_by, notes, status, completed_at, completed_by + colunas de sync). Adicionada a `SYNCED_TABLES`. RLS no Supabase: leitura livre p/ autenticados, INSERT só admin, UPDATE qualquer autenticado (peão completa), DELETE só admin. **Precisa rodar a migration manualmente no Supabase SQL Editor.**

**Camadas de usuário** (`app/src/app/(tabs)/_layout.tsx` + `(tabs)/index.tsx` + `admin/_layout.tsx`):
- `peao` vê tabs: Painel, Ronda, Estoque, Mapa. Rebanho e Relatório ocultos via `tabBarButton: () => null` + `href: null`.
- `admin` vê todas as 6 tabs (sem mudança).
- Painel pra peão: ícone Settings (engrenagem) escondido + seção REBANHO escondida.
- `/admin/*` redireciona pra `/(tabs)` se `user.role !== 'admin'` — evita acesso por deep-link.
- Sem mudança no enum `'admin' | 'peao'` — apenas gateamos UI por role.

**Volta pro menu do piquete pós-finalizar** (11 telas summary/finalização em `app/src/app/ronda/[paddockId]/**`):
- `router.replace('/(tabs)/ronda')` → `router.replace(\`/ronda/${paddockId}/menu\`)`. Permite emendar mais uma avaliação no mesmo piquete sem buscar de novo.

**Categorização Obrigatórios/Sob demanda** (`ronda/[paddockId]/menu.tsx`):
- `EVAL_ITEMS` ganha campo `category`. Renderiza duas seções (`OBRIGATÓRIOS` / `SOB DEMANDA`) com mesmo grid 2-col.

**Fluxo de delegação** (admin → peão):
- `app/src/lib/inspection-requests.ts`: helpers `listPendingRequests`, `countPendingRequests`, `listPendingTop`, `createRequest` (idempotente em pending), `cancelRequest` (soft via status), `completeRequestFor` (auto-complete pelo peão).
- `app/src/app/admin/solicitacoes.tsx`: lista pending agrupada por piquete + modal de criação (picker de piquete com search, multi-choice de inspeção, notas opcional). Tap em item pendente → confirma cancelamento.
- `app/src/app/admin/index.tsx`: nova entrada "Solicitações" no topo do menu de admin.
- `ronda/[paddockId]/menu.tsx`: tile com pending request ganha borda warn + badge "SOLICITADO" + texto "Pedido pelo admin".
- 6 summaries sob demanda (bombona/forage/biological/health/weight/washing): após INSERT, chamam `completeRequestFor(db, paddockId, evalKind, user.id)` — auto-completa qualquer pending pra aquela combinação.
- Painel: nova seção "SOLICITADO" (visível pra todos) listando até 5 pending mais antigas, tap abre menu do piquete. Header só clicável pra admin (vai pra tela de gestão).

**Fallback:** `git checkout v0.6.1`.

---

## v0.6.1 — "Auditoria E2E + 10+ bug fixes críticos" (2026-04-22)

Auditoria completa via Playwright MCP com login do admin real. Descoberta + correção de bugs críticos de integridade de estoque, sync e UX. Migration Supabase aplicada pra destravar UPDATE de rotas. Testado no web; APK preview necessário pra validar runtime nativo.

**P0 — Críticos (bloqueavam uso ou corrompiam dados):**
- **Mapa web não crasha** (`components/map/FarmMap.web.tsx`): trocado `Image.resolveAssetSource` (API nativa, inexistente no react-native-web) por `Asset.fromModule` do expo-asset. Cache `tileUriCache` pra não recriar Asset a cada tile do Leaflet. Sem isso, a tela `/mapa` era error boundary "Uncaught Error: Image.default.resolveAssetSource is not a function".
- **7 summaries de ronda gravam no DB** (`ronda/[paddockId]/{bombona,forage,water,health,fence,weight,washing}/summary.tsx`): todo campo numérico passa por `Number.isFinite(x) ? x : 0`, text NOT NULL ganha fallback, INSERT em try/catch com `console.error('[summary-save-error]')` + `Alert.alert` visível. Antes, NaN chegava silenciosamente no SQLite e o INSERT era rejeitado sem feedback — peão não sabia que o dado não salvou.
- **Retorno do reabastecimento não infla estoque** (`reabastecimento/resumo.tsx`): `loadSummary` calcula `sacks_distributed` via `SUM(resupply_deliveries)` em vez de ler `rl.sacks_distributed` (campo que não era atualizado corretamente). `Math.max(0, loaded - distributed)` evita retorno negativo. Fix evita 30+ sacos fantasma entrando no central a cada rota encerrada.
- **Sync engine preserva mudanças locais pending** (`lib/sync/engine.ts:localUpdateFromRemote`): antes de sobrescrever row com versão remota, verifica se `pending_sync=1` localmente — se sim, skippa o UPDATE. Antes, rota finalizada localmente (status='completed') era revertida pro server (ainda in_progress) antes do push conseguir passar, perdendo o estado local pra sempre.
- **Zustand ESM → CJS no bundle web** (`metro.config.js`): `resolveRequest` custom intercepta `zustand/*` e força condition `react-native` → cai no entry CJS. Sem isso, o web bundle explodia com `SyntaxError: Cannot use 'import.meta' outside a module` (zustand/esm/middleware.mjs usa `import.meta.env` padrão Vite).
- **Migration Supabase — `DEFAULT auth.uid()` + backfill** (`supabase/migrations/2026-04-22_created_by_default_auth_uid.sql`): adiciona default em `created_by` de 15 tabelas sincronizadas + backfill copiando `user_id` quando existe + cleanup de rotas in_progress > 12h. Sem o default, push UPDATE era silenciosamente rejeitado pela RLS (`created_by = auth.uid()` falha com NULL) — o que gerava as 10+ rotas penduradas e o estoque fantasma. **Precisa rodar manual no Supabase SQL Editor.**

**P1 — Importantes (integridade da UI):**
- **rota.tsx UI usa deliveries reais** (`reabastecimento/rota.tsx`): "No trator", "X disp" por fórmula, "Estoque atual na bombona" — todos agora calculam via `SUM(resupply_deliveries)`, mesmo pattern do resumo. `openDelivery` prioriza a fórmula que está efetivamente na bombona atual do piquete. Antes, UI mostrava "30/30 sacos" mesmo após entregar 10 (estado só da sessão atual).
- **Headers "null" → "—"** (`ronda/[paddockId]/{forage,health,weight}/summary.tsx` + `weight/step2.tsx`): fallback `?? '—'` em interpolações que liam store antes da hidratação. `menu.tsx` hidrata `paddock.name + grass_type + head_count` em navegação direta (deep-link/reload).
- **Sanidade mostra cabeças reais** (`ronda/[paddockId]/health/step2.tsx`): fallback query ao DB (`SUM(head_count) FROM herd WHERE paddock_id`) quando `store.currentPaddockHeads === 0`. Antes, slider mostrava "~0 de 0 cabeças" mesmo em piquete com 31 cab.

**P2/P3 — Polimento:**
- **Plurais PT-BR em 19 arquivos** (`constants/index.ts` + 18 telas): novo helper `sacos(n)/cabecas(n)/dias(n)/bombonas(n)/piquetes(n)` usando `plural(n, singular, pluralForm)` com `Math.abs` NaN-safe. "1 sacos × 30 kg" vira "1 saco × 30 kg". Rótulos de range do slider (min/max fixos) mantidos no plural — são escala, não valor dinâmico.
- **GO_BACK warning eliminado** (`estoque/entrada.tsx`, `estoque/ajuste.tsx`): `router.replace('/(tabs)/estoque')` em vez de `router.back()` no pós-save. Evita "GO_BACK action not handled" em deep-link/reload sem stack.
- **Slider clamp no mount** (`components/ui/SliderInput.tsx`): `useEffect` força valor pra dentro de `[min, max]` se estiver fora na primeira render. Antes, wizard com slider min=1 começava em 0 (store zerado) e deixava avançar com valor inválido.
- **CLAUDE.md atualizado** (7 correções): 6 tabs (+ Relatório), 9 seções de ronda (+ Biológico), 11 categorias de gado (+ BEZERRO/BEZERRA/NOVILHA PRENHA/BOI), redirect pós-summary vai pra `/(tabs)/ronda` (não menu.tsx), syncStore é engine real (não placeholder), version tags expandidas até v0.6.0 RC1.4, wizard folders inclui `biological`.

**Nota sobre teste:**
- Validação feita no web via Playwright com login real (`lucas`). Bombona + Water + Mapa + UI do estoque + Fase 3 do reabastecimento testados cabo-a-cabo. Plural "1 saco" validado visualmente. Migration reduziu rotas penduradas de 10+ para 1.
- **Forage summary teve comportamento flaky no web** (handler Finalizar não disparou em uma tentativa) — provavelmente artefato do stack web (DOM manteve árvore do step1 montada e interceptou o clique). Não reprodutível em nativo.

**Tags auxiliares de rollback criadas:** `pre-e2e-investigation`, `pre-bug-fixes`.

**Fallback:** `git checkout v0.6.0`.

**Hotfix restante pra v0.6.2+:** Cancelar manual das 9 rotas in_progress mais antigas que ficaram (migration só limpa >12h). Validação em APK preview. RLS policies adicionais no Supabase (fora do app) se algum INSERT de eval continuar caindo.

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
