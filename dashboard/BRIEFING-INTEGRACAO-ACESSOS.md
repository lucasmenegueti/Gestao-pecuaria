# Briefing — Integração com o hub gestao-acessos

Documento de trabalho pro agente deste repo. Fonte canônica do protocolo:
`../../gestao-acessos/docs/protocolo-sso.md` — em qualquer divergência, a spec vence.
Não inventar endpoints além dos que ela lista.

## 1. Contexto

O hub **gestao-acessos** (`../../gestao-acessos`, prod `https://gestao-acessos-nsa.netlify.app`)
passa a ser a **fonte única de identidade e permissão** dos apps da Fazenda NSA.
Motivos: hoje cada app tem seu próprio backend de identidade; revogar acesso de
alguém exige tocar app por app. Com o hub: desabilitar usuário / trocar senha /
revogar papel reflete em todos os satélites em **≤60s**, e toda mudança de
acesso gera evento de auditoria central (tabela `Audit` no Airtable do hub).

O protocolo já está implementado no hub: login SSO com handoff
(`/login?app=...&redirect=...`), `POST /api/nsa-access/exchange` e
`POST /api/nsa-access/lookup`.

Sequência de rollout:

- **F1** — piloto: gestao-operacoes (em andamento)
- **F2** — apps web Next.js, **incluindo este dashboard**
- **F3** — PWAs vanilla via BFF (Netlify Functions)
- **F4** — mobiles Expo (gestao-pecuaria, agricultura)

Este app é **F2**: não começar a implementação de fluxo antes do piloto ser
validado, mas a preparação listada na seção 5 já pode ser feita.

## 2. Estado atual deste app (verificado no código em 2026-07-23)

Dashboard web read-only da pecuária. O login é local, mas a credencial é
verificada contra o **Supabase Auth do app mobile gestao-pecuaria** (via Worker
proxy Cloudflare `https://nsa-supa.lucas-cf1.workers.dev`):

1. Form em `src/app/login/login-form.tsx` posta pra server action
   `loginAction` (`src/app/login/actions.ts`).
2. `verifyCredentials` (`src/lib/auth/users-lookup.ts:20-120`) faz 3 chamadas:
   - username → email via RPC pública `email_for_username` (`users-lookup.ts:34-47`);
   - `POST ${SUPABASE_URL}/auth/v1/token?grant_type=password` com email+senha
     (`users-lookup.ts:60-77`) — devolve `accessToken`/`refreshToken` do Supabase;
   - lê `profiles` com o JWT do próprio user e **rejeita se
     `profile.role !== 'admin'`** (`users-lookup.ts:105-108`). A role interna
     retornada é sempre `'owner'` hardcoded (`users-lookup.ts:111`).
3. Cookie iron-session `pecuaria_session` guarda username, role, `accessToken`,
   `refreshToken`, `expiresAt` (`src/lib/auth/session.ts:5-17`); maxAge 24h ou
   30 dias com "lembrar" (`session.ts:19-21`). `SESSION_PASSWORD` própria.
4. Guard: `src/middleware.ts` (ainda `middleware.ts`, não `proxy.ts`) protege
   tudo exceto `/login` e `/api/logout` (`middleware.ts:4`) e checa **apenas**
   `session.username` (`middleware.ts:34`) — zero lookup remoto, zero revogação.
5. Cada uma das 8 pages de `(dash)` chama `getSessionOrRedirect`
   (`src/lib/auth/session-server.ts:11-29`), que exige `accessToken` presente e
   não expirado (`session-server.ts:17-23`). JWT do Supabase expira ~1h e **não
   há refresh flow** — expirou, re-login.
6. **Confirmado: o `accessToken` do user É usado nos fetches de dados.** As
   pages repassam `session.accessToken` aos loaders (ex:
   `src/app/(dash)/visao-geral/page.tsx:21-22` →
   `loadDashboardData(period, accessToken)` em `src/lib/queries.ts:121-124`) e
   `sbList`/`sbRpc` mandam `Authorization: Bearer <JWT do user>` porque RLS
   bloqueia anon (`src/lib/supabase/client.ts:25-27,51`).
7. Logout: `GET/POST /api/logout` destrói o cookie (`src/app/api/logout/route.ts`).
8. Legado: `src/lib/auth/users.ts` só tem tipos — hashes bcrypt locais já foram
   removidos. `bcryptjs` segue em `package.json` sem uso.
9. **Não existe** `/api/nsa-access/manifest` nem nenhuma rota `nsa-access`.

## 3. Contrato com o hub

Resumo — detalhes completos em `../../gestao-acessos/docs/protocolo-sso.md`:

- `*.netlify.app` está na Public Suffix List → cookie compartilhado é
  impossível. O hub emite **token de handoff** (TTL 60s); o satélite troca por
  identidade no `/exchange` e cria **sessão iron-session local própria**.
- Sem sessão local → `302 HUB/login?app=<slug>&redirect=<BaseUrl>/api/nsa-access/callback`
  (a query `next=` própria é preservada pelo hub).
- Callback (server-side): `POST HUB/api/nsa-access/exchange` com `{token}` e
  `Authorization: Bearer NSA_ACCESS_SECRET` → recebe identidade → grava cookie
  local → redirect pra `next ?? "/"` (consome o token e limpa a URL).
- A cada request autenticado, o middleware chama
  `POST HUB/api/nsa-access/lookup` com `{user_id, app_slug, session_version}`
  — cacheado por **no máximo 60s**. `valid: false` → destrói sessão e manda pro
  hub. Hub fora do ar: stale-if-error até 5 min, depois bloqueia.
- O hub só redireciona pro origin da BaseUrl registrada em `Apps`; em dev
  (`NODE_ENV != production`) aceita `localhost`.

### Env vars

| Var | Valor |
|---|---|
| `NSA_HUB_URL` | `https://gestao-acessos-nsa.netlify.app` |
| `NSA_ACCESS_SECRET` | mesmo valor do hub (64 hex). Server-only, **nunca** `NEXT_PUBLIC_*` |
| `SESSION_PASSWORD` | própria deste app (já existe; manter, não copiar do hub) |

### Payload de identidade (`user` do exchange/lookup)

```json
{
  "user_id": "recXXXXXXXXXXXXXX",
  "username": "joao",
  "name": "João da Silva",
  "session_version": 3,
  "app_slug": "gestao-pecuaria-dashboard",
  "is_global_admin": false,
  "levels": ["admin"],
  "roles": [{ "slug": "gestao-pecuaria-dashboard-admin", "level": "admin", "scopes": ["gestao-pecuaria-dashboard:admin"] }]
}
```

## 4. Mapa de níveis

Roles já semeados no Airtable do hub:

| Papel no hub | Payload | Gate interno neste app |
|---|---|---|
| `admin-global` (Lucas) | `is_global_admin: true` | Acesso total — nível mais alto, sempre passa |
| `gestao-pecuaria-dashboard-admin` | `levels: ["admin"]` | Acesso total (único nível do app) |
| (nenhum papel) | `valid: false` / `403 no_role` | Sem acesso |

O app é read-only e nenhuma rota é gateada por role hoje — o gate é binário
(tem papel no app ou é admin-global → entra; senão → não entra). A role interna
`'owner' | 'gestor'` vira apenas label de exibição no sidebar
(`src/components/sidebar.tsx`); mapear `is_global_admin` / `admin` → label
adequado e eliminar o hardcode `'owner'`.

## 5. Adaptação passo a passo

### Decisão a tomar antes de implementar — acesso a dados do Supabase (CRÍTICO)

Confirmado na seção 2: o JWT per-user do Supabase é a única forma que o app tem
de passar pela RLS nas queries (`src/lib/supabase/client.ts`). Quando o login
sair daqui, o password grant (`users-lookup.ts:60`) some e não há mais como
obter esse JWT. A integração exige **separar identidade de acesso a dados**:

- **Identidade** — vem do hub (handoff + lookup).
- **Dados** — o dashboard passa a usar **credencial de serviço server-side**
  contra o Supabase da pecuária, nunca exposta ao browser. Opções, em ordem de
  atrito:
  1. `SUPABASE_SERVICE_ROLE_KEY` em env server-only (bypass RLS; o app já é
     100% server-side e read-only, risco contido);
  2. política RLS de leitura pra um role técnico dedicado.
- Registrar a escolha com o Lucas na implementação. O Supabase é do app
  mobile gestao-pecuaria — **read-only, não mexer em schema/policies sem
  aprovação dele**.

Consequência boa: `accessToken`/`refreshToken`/`expiresAt` saem do cookie, o
problema da sessão morrer em ~1h desaparece, e o `refreshToken` para de viajar
no cookie do browser.

### Preparação que já pode ser feita (antes da F2)

1. **Criar `GET /api/nsa-access/manifest`** — `src/app/api/nsa-access/manifest/route.ts`,
   público (adicionar ao `PUBLIC_PATHS` do middleware), retornando:
   ```json
   {
     "app_slug": "gestao-pecuaria-dashboard",
     "hub_base_id": "<AIRTABLE_BASE_ID do hub>",
     "version": "1",
     "profiles": [
       { "slug": "admin", "display_name": "Admin", "description": "Acesso total ao dashboard" }
     ]
   }
   ```
   `profiles[].slug` é estável — nunca renomear. Confirmar `hub_base_id` com o
   hub (não chutar).
2. **Adicionar `.env.example`**: `NSA_HUB_URL` e `NSA_ACCESS_SECRET` (com
   comentário server-only).
3. Nada mais — não tocar no fluxo de login enquanto o piloto (F1) não for
   validado.

### Trabalho da F2 (quando liberada)

Ordem sugerida; cada item cita os arquivos:

1. **`src/lib/auth/session.ts`** — reescrever `SessionData`:
   remover `accessToken`/`refreshToken`/`expiresAt`; adicionar `userId`
   (record ID do hub), `sessionVersion`, `isGlobalAdmin`, `levels`. Manter
   cookie `pecuaria_session` e `SESSION_PASSWORD` própria.
2. **Criar `src/app/api/nsa-access/callback/route.ts`** (server-side):
   recebe `?nsa_token=...&next=...`; `POST ${NSA_HUB_URL}/api/nsa-access/exchange`
   com `{token}` e `Authorization: Bearer ${NSA_ACCESS_SECRET}`; em `200 ok`,
   grava o cookie local com a identidade e responde **redirect** pra `next`
   sanitizado (replicar a lógica de `sanitizeFrom` de
   `src/app/login/actions.ts:49-55` — path relativo apenas) ?? `/visao-geral`.
   Token inválido/expirado → redirect pro login do hub (recomeça o fluxo).
   Adicionar a rota ao `PUBLIC_PATHS` do middleware.
3. **Criar `src/lib/auth/hub.ts`** — client server-only do lookup:
   `POST ${NSA_HUB_URL}/api/nsa-access/lookup` com
   `{user_id, app_slug: "gestao-pecuaria-dashboard", session_version}` +
   Bearer secret. Cache ≤60s por usuário; stale-if-error até 5 min. Atenção:
   middleware Edge no Netlify não garante memória entre invocações — usar Next
   data cache (`fetch` com `revalidate: 60`) ou aceitar 1 fetch/request; **não**
   relaxar os 60s.
4. **`src/middleware.ts`** — sem sessão local: `302
   ${NSA_HUB_URL}/login?app=gestao-pecuaria-dashboard&redirect=<origin>/api/nsa-access/callback`
   (carregar o destino original em `next=`). Com sessão: chamar o lookup (item
   3); `valid: false` → destruir cookie e redirecionar pro hub. Opcional na
   mesma passada: renomear pra `src/proxy.ts` (convenção Next 16 dos apps NSA).
5. **Deletar `src/app/login/`** (page, form, actions) e
   **`src/lib/auth/users-lookup.ts`** — login não existe mais aqui. Remover
   `bcryptjs` do `package.json` (já era órfão). `src/lib/auth/users.ts` (só
   tipos legados): remover se nada mais importar.
6. **`src/lib/auth/session-server.ts`** — `getSessionOrRedirect` deixa de
   exigir/retornar `accessToken`; passa a retornar `{username, isGlobalAdmin,
   levels}` e redirecionar pro **hub** (não `/login` local) quando faltar sessão.
7. **`src/lib/supabase/client.ts` + `src/lib/queries.ts` + as 8 pages de
   `(dash)`** — trocar o parâmetro `accessToken` pela credencial de serviço
   (decisão acima): `client.ts` lê a credencial de env server-only e monta o
   `Authorization` sozinho; remover o parâmetro das assinaturas e dos call
   sites (`visao-geral`, `rebanho`, `talhoes`, `mapa`, `estoque`, `inspecoes`,
   `alertas`, `equipe`).
8. **`src/components/sidebar.tsx` / `src/app/(dash)/layout.tsx`** — label a
   partir de `is_global_admin`/`levels` em vez da role `'owner'|'gestor'`.
9. **`/api/logout`** — continua destruindo só o cookie local (logout local por
   design; revogação global é feita no hub).
10. **Pós-migração (fora deste repo, coordenar com o Lucas):** desativar a RPC
    pública `email_for_username` no Supabase da pecuária (risco de enumeração
    de usernames→emails) e aposentar o gate `profiles.role='admin'` — a
    permissão "quem acessa o dashboard" passa a viver só em `Roles`/`UserRoles`
    do hub (duas fontes de verdade é inaceitável).

## 6. Regras não-negociáveis

- **Sem cópia local de Users** — nem tabela, nem cache persistente, nem "só uns
  hashes pra emergência".
- **Login só no hub** — este app não renderiza form de senha nem aceita
  credencial. Sem sessão → redirect pro hub.
- **Lookup cacheado por no máximo 60s.** Performance ruim → conversar com o
  hub, não aumentar o TTL.
- **Rotas sensíveis bypassam o cache.** Hoje este app não tem nenhuma (100%
  read-only); se um dia ganhar escrita, a rota nasce com lookup direto.
- **Callback consome o token e responde com redirect** — o `nsa_token` nunca
  fica na URL do browser nem em histórico.
- **`SESSION_PASSWORD` própria do app** — não compartilhar com o hub nem com
  outros satélites.
- **`NSA_ACCESS_SECRET` é server-only** — nunca em `NEXT_PUBLIC_*`, nunca
  chamado do browser, nunca em log.
- **Credencial de serviço do Supabase é server-only** — mesma regra.
- **Toda dúvida de contrato → perguntar no hub** (spec ou Lucas), não
  improvisar endpoint, campo ou comportamento.

## 7. Validação

1. `npm run lint` + `npm run typecheck` + `npm run build` limpos.
2. Fluxo completo em dev: hub rodando local (aceita callback `localhost` fora
   de produção) → acessar o dashboard sem sessão → redirect pro login do hub →
   autenticar → callback grava cookie → landing em `/visao-geral` com dados
   carregando (prova de que a credencial de serviço funciona).
3. Testar revogação: desabilitar o user no hub → dashboard derruba a sessão em
   ≤60s no próximo request.
4. Testar `next=`: acessar `/rebanho` deslogado → após login, cair em `/rebanho`.
5. Deploy preview Netlify (branch ≠ main) com env vars configuradas → repetir o
   fluxo contra o hub de produção **antes** de merge em `main`.
