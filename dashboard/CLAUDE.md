# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Dashboard web (Next.js App Router) de **gestão de pecuária da Fazenda NSA**. Consome o **mesmo Supabase do app de campo** `gestao-pecuaria` (repo irmão em `../gestao-pecuaria`) — este repo **não tem banco próprio nem migrations**. Público: dono e gestor, no navegador; o peão usa o app mobile.

Predominantemente **leitura**. A única escrita hoje é o preço de compra da ração (`/configuracoes` → tabela `inventory_entry_prices`).

## Comandos

```bash
npm run dev        # localhost:3000
npm run build      # portão real de CI (Netlify roda isso)
npm run typecheck  # tsc --noEmit
```

**`npm run lint` está quebrado** (`esutils` corrompido em `node_modules`) — não é erro de código, não tente consertar sem pedido. Use `build` + `typecheck` como portão.

**`typecheck` cospe erros falsos** vindos de pastas duplicadas `.next/… 2` (sincronização do macOS). Ver só os reais:

```bash
npm run typecheck 2>&1 | grep '^src/'
```

Não há testes automatizados. Para exercitar a camada de dados sem login, ver "Testar sem login" abaixo.

## Deploy

Produção é a branch **`main`** com auto-deploy do Netlify (site `gestao-pecuaria-nsa`, https://gestao-pecuaria-nsa.netlify.app). `git push origin main` já publica.

A branch `feat/relatorio-diario-pecuaria` está à frente de main **só em `relatorio-diario/`** (script Python do PDF diário, rodado por rotina cloud que clona aquela branch). Não mergeie a branch inteira para publicar uma mudança de site — crie branch a partir de `main` com o que vai pro ar.

## Auth e acesso ao dado — leia antes de escrever qualquer query

Fluxo (`src/lib/auth/`): username → email via RPC `email_for_username` → Supabase Auth (password grant) → checa `profiles.role = 'admin'` → guarda **JWT em cookie iron-session**. Quem não é admin não entra.

**Toda query precisa do `accessToken` do usuário.** RLS bloqueia leitura anônima e, pior, retorna **`200 []` silencioso** em vez de erro — uma query sem token parece "sem dados". Padrão de página:

```ts
export const dynamic = 'force-dynamic';       // sempre: dado é por-usuário e vivo
const session = await getSessionOrRedirect();
const data = await loadDashboardData(period, session.accessToken);
```

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
- **O sync duplica eventos** (ver `../gestao-pecuaria/BRIEFING-duplicacao-rondas.md`): o mesmo movimento aparece 2× com UUIDs diferentes, e o estado (`herd`) às vezes recebeu 1×, às vezes 2×. Onde isso importa, deduplique por chave lógica e **avise na tela** quantos foram descartados.
- **`herd.head_count` é o estado de hoje**, não do período — talhões com consumo no mês podem estar zerados agora. Para janela histórica é preciso replay reverso dos `herd_events` (`consumo-calc.ts`).
- **`supplement_evals.sacks_in_trough` = sacos COLOCADOS no cocho**, não saldo (o app pergunta "quantos sacos colocou?"). Só preenchido quando `restocked`.
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
