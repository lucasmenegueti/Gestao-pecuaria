# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Dashboard web (Next.js App Router) de **gestão de pecuária da Fazenda NSA**. Consome o **mesmo Supabase do app de campo** `gestao-pecuaria` (o app fica em `../app`, neste mesmo repo — o dashboard foi fundido aqui em 27/10/2026, com histórico) — o dashboard **não tem banco próprio nem migrations**. Público: dono e gestor, no navegador; o peão usa o app mobile.

Predominantemente **leitura**. A única escrita hoje é o preço de compra da ração (`/configuracoes` → tabela `inventory_entry_prices`).

## Comandos


**`npm run lint` está quebrado** (`esutils` corrompido em `node_modules`) — não é erro de código, não tente consertar sem pedido. Use `build` + `typecheck` como portão.

**`typecheck` cospe erros falsos** vindos de pastas duplicadas `.next/… 2` (sincronização do macOS). Ver só os reais:

```bash
npm run typecheck 2>&1 | grep '^src/'
```

Não há testes automatizados. Para exercitar a camada de dados sem login, ver "Testar sem login" abaixo.

## Deploy

Deploy **manual, pelo terminal** (auto-deploy do Netlify está desligado — `stop_builds`; push não publica nada). Site `gestao-pecuaria-nsa` (id `a8c2393a-b210-4ea4-b075-fb77a38458b2`), https://gestao-pecuaria-nsa.netlify.app. De `dashboard/`:

```bash
npx netlify-cli deploy --build --site a8c2393a-b210-4ea4-b075-fb77a38458b2            # rascunho: conferir a Draft URL
npx netlify-cli deploy --build --prod --site a8c2393a-b210-4ea4-b075-fb77a38458b2     # produção
```

O build roda local com as env vars do site no Netlify (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SESSION_PASSWORD`, `TZ`, `CURRAL_SUPABASE_URL`, `CURRAL_SUPABASE_ANON_KEY`). Não confundir com o outro site do repo (`nsa-gestao-pecuaria`, web do app — ver `../CLAUDE.md`).

`relatorio-diario/` (Python do PDF diário → WhatsApp) é rodado por rotina cloud (`trig_01URkNDoJHXA7svYcVZbVjzK`, 21:15 BRT) que clona **este** repo e entra em `dashboard/relatorio-diario`. Mudou o script → commit + push basta; a rotina pega no próximo disparo.

## Auth e acesso ao dado — leia antes de escrever qualquer query

Fluxo (`src/lib/auth/`), em dois modos por conta — o mesmo desenho do app (`../CLAUDE.md` › Auth, `../BRIEFING-INTEGRACAO-ACESSOS.md`):

- A RPC `auth_mode(username)` diz `hub` ou `legado` (qualquer falha = `legado`).
- **`hub`**: a server action chama a Edge Function `hub-auth/login` (`lib/auth/hub.ts`), que confere a senha no hub gestao-acessos e devolve uma sessão do MESMO usuário no Supabase. Recusa do hub (senha errada, acesso desativado…) **não** cai no caminho direto; função fora do ar cai, e aí "senha errada" vira "Servidor de login indisponível".
- **`legado`**: username → email via RPC `email_for_username` → Supabase Auth (password grant).
- Nos dois: checa `profiles.role = 'admin'` com o JWT do usuário e guarda access + refresh token em **cookie iron-session**. Quem não é admin não entra.

**Renovação e revalidação moram no `src/middleware.ts`** (Server Component não pode gravar cookie):
- JWT a menos de 5 min de vencer → renova com o refresh token. Já vencido → renova e redireciona pra mesma URL com o cookie novo. Refresh recusado → a página manda pro login.
- A cada 60 s, no máximo, pergunta à `hub-auth/check` se a sessão ainda vale. Só `valid:false` com motivo conhecido encerra (cookie destruído, redirect pro login): acesso tirado no hub, ou sessão que não foi emitida pelo hub com a conta em `hub`. Rede, 503 e conta em `legado` nunca derrubam.
- O segundo login no Curral (abaixo) continua com a senha digitada e **não** é renovado: a aba Curral vale ~1 h por login.

Teste (stack local, sem tocar prod/QA): `../supabase/functions/hub-auth/teste-local/dashboard-login.mjs` (ver o `LEIAME.md` da pasta).

**Toda query precisa do `accessToken` do usuário.** RLS bloqueia leitura anônima e, pior, retorna **`200 []` silencioso** em vez de erro — uma query sem token parece "sem dados". Padrão de página:

```ts
export const dynamic = 'force-dynamic';       // sempre: dado é por-usuário e vivo
const session = await getSessionOrRedirect();
const data = await loadDashboardData(period, session.accessToken);
```

**Curral (`/curral`) lê de OUTRO Supabase.** O app `curral-nsa` só existe no branch QA (`zmetxajiimsclhuhaykv`), que é a produção de fato do Curral até a virada para prod. O QA tem outro segredo de JWT — o token de prod volta 401 lá. Por isso o login faz um **segundo password grant** no projeto do Curral (`signInCurral`, mesmas credenciais, usuários clonados) e guarda `curralAccessToken` na sessão; falhar ali não barra o login, só deixa a aba avisando. Queries do Curral passam `conn` para `sbList`/`sbListAll`. Na virada do Curral para prod: apontar `CURRAL_SUPABASE_URL`/`_ANON_KEY` para prod, sem mexer em código. Sessões antes de `INICIO_OPERACAO_REAL` (23/09/2026) são base de teste e ficam ocultas; tempo e ritmo vêm dos bipes (`event_at`), não de `started_at`/`closed_at`.

`SUPABASE_URL` aponta para um **Worker proxy Cloudflare**, não direto para o Supabase (contorna bloqueio de IP em redes da região). Ele repassa method/headers/body — POST e PATCH funcionam.

## Camada de dados (`src/lib/`)

- **`supabase/client.ts`** — `sbList` / `sbListAll` / `sbUpsert` / `sbRpc` sobre PostgREST via `fetch`. Sem SDK.
  - Use **`sbListAll`** (pagina até acabar) quando o resultado puder passar do teto de linhas do PostgREST; truncamento lá é silencioso. Sempre passe `order` com desempate único (`'created_at,id'`) — offset com chave repetida pula ou duplica linha.
- **`queries.ts`** — `loadDashboardData`: um pacotão que quase toda página usa. Cuidado: busca `herd_events` com `limit: 50` e `herd` com `head_count > 0` — insuficiente para qualquer cálculo histórico.
- **`consumo.ts` / `precos.ts`** — I/O próprio das abas de consumo e preço, para não inchar (nem pagar) o pacotão acima.
- **`consumo-calc.ts` / `custo-racao.ts`** — **funções puras, sem I/O e sem `server-only`**. É o que permite testar o cálculo fora do Next. Mantenha essa separação ao adicionar lógica nova.
- **`period.ts`** — período vem da URL (`?periodo=hoje|ontem|7d|30d|semana-passada|custom`). `parsePeriodFromSearchParams(params, fallback)` — passe o fallback quando a página precisar de janela larga.

### Armadilhas do schema (custaram bug nesta base)

- **IDs são UUID (string)**. `supabase/types.ts` declara `id: number` — legado, inofensivo para exibir, perigoso para comparar. Módulos novos declaram os próprios tipos com `string`.
- **Sempre filtre `deleted_at=is.null`.** O sync do app grava linhas duplicadas e depois marca as antigas como deletadas; `queries.ts` não filtra e por isso infla contagens.
- **Datas**: `created_at` é `timestamptz` — filtre no fuso BRT (`gte.2026-07-01T00:00:00-03:00`), nunca em UTC. Já `rondas.date` e `herd_events.date` são `date` puro: compare como string de dia, sem offset.
- **O sync duplica eventos** (ver `../BRIEFING-duplicacao-rondas.md`; causa corrigida no app na v0.13.1 — histórico limpo, mas mantenha a dedupe como defesa): o mesmo movimento aparece 2× com UUIDs diferentes, e o estado (`herd`) às vezes recebeu 1×, às vezes 2×. Onde isso importa, deduplique por chave lógica **+ `created_at`** (`dedupEventos`) e **avise na tela** quantos foram descartados. Sem o `created_at` a dedupe come lançamento legítimo repetido: a tela de nascimento do app trava em 20 por vez, então 40 bezerros entram como 20 + 20 (P78, 09/11/2026).
- **`herd.head_count` é o estado de hoje**, não do período — talhões com consumo no mês podem estar zerados agora. Para janela histórica é preciso replay reverso dos `herd_events` (`consumo-calc.ts`).
- **`supplement_evals.sacks_in_trough` = sacos COLOCADOS no cocho**, não saldo (o app pergunta "quantos sacos colocou?"). Só preenchido quando `restocked`.
- **`formulas.target_g_per_kg_body_day` é g por CABEÇA/dia**, apesar do nome. Projeção de consumo passa por `consumoDiarioKg` (`consumo-calc.ts`, porte do app): cabeças × alvo, nunca peso vivo × alvo (dava ~400× e zerava toda bombona). **Bezerro/bezerra mamando fica fora de toda conta de consumo e custo** (`CATEGORIAS_MAMANDO`) — mama na vaca e é contabilizado por ela.
- **`herd_events` do tipo `EVOLUCAO` grava só a categoria de origem**; o destino está em `notes` como `"BEZERRO → GARROTE"`. `AJUSTE` subtrai.
- **`inventory.quantity_sacks`** é mantido por trigger como soma crua do ledger e **bate com ele** — dá para usar como asserção. O ledger fica negativo em trechos antigos; não trave saldo em zero ao fazer replay.

## UI

- **Design system NSA**: todos os tokens vivem em `src/app/globals.css` (`@theme` do Tailwind v4), convertidos de `nsa-design-system/project/colors_and_type.css`. **Não invente cor, tamanho ou raio fora dos tokens** — use `text-fg-muted`, `bg-bg-elevated`, `border-border`, `text-h2`, `rounded-lg` etc. Números tabulares: classe `.tabular`.
- **`components/ui-primitives.tsx`** — `KPICard`, `Card`, `StatusPill`, `AlertCard`, `EmptyState`. Server-friendly (JSX puro, sem hooks). Prefira compor com eles a criar variante nova.
- Ícones: `lucide-react` com `strokeWidth={1.75}`.
- Páginas são **Server Components**; `'use client'` só onde há estado real (sidebar, period picker, mapa Leaflet, formulário de preço).
- Todo texto de interface é **PT-BR**.

## Testar sem login

O login exige senha real do Supabase, então a camada de dados se testa por harness em Node, rodando **o módulo real** (não cópia):

```bash
node --experimental-strip-types --import ./register-hooks.mjs script.ts
```

Onde `register-hooks.mjs` registra um resolver que (a) neutraliza `import 'server-only'` e (b) resolve imports sem extensão. Com `globalThis.fetch` stubado servindo dumps do Supabase (respeitando `limit`/`offset`, senão `sbListAll` lacra em loop), dá para exercitar `loadConsumoData` inteiro e conferir os totais contra SQL. Foi assim que os bugs reais desta base apareceram.
