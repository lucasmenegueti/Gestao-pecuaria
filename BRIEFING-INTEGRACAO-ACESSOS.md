# Briefing — Integração com o hub gestao-acessos

> Status deste briefing: **heads-up de F4 — nenhuma mudança de código de integração agora.**
> A decisão de identidade (migrar credencial do Supabase Auth pro hub vs hub como fonte
> só de AUTORIZAÇÃO) está **adiada até o fim do piloto web**. O que dá pra fazer já está
> separado em "preparação" na seção 5.

## 1. Contexto

O hub **gestao-acessos** (`../gestao-acessos`, prod `https://gestao-acessos-nsa.netlify.app`)
está virando a fonte única de identidade e permissão de todos os apps da Fazenda NSA.
Motivos:

- **Fonte única** — usuários, papéis e permissões numa tabela só (Airtable do hub), em vez de
  cada app com seu backend de identidade.
- **Revogação rápida** — desabilitar usuário / trocar senha / revogar papel no hub derruba a
  sessão em todos os satélites em ≤60s (via `SessionVersion` + lookup).
- **Auditoria central** — todo login e toda mudança de acesso vira registro imutável em `Audit`.

Sequência de rollout:

| Fase | Escopo | Status |
|---|---|---|
| F1 | Piloto: gestao-operacoes (web Next.js) | em andamento |
| F2 | Demais webs Next.js | — |
| F3 | PWAs vanilla via BFF (Netlify Functions) | — |
| F4 | **Mobiles Expo (este app + agricultura)** | — |

Este app é **F4 — a última e mais arriscada fase**, por ser offline-first: o contrato de
revogação em 60s conflita estruturalmente com "peão no piquete sem sinal". A regra offline
acordada está na seção 6.

## 2. Estado atual deste app (verificado hoje contra o código)

Backend de identidade: **Supabase Auth (email+senha) + `public.profiles`**. Sem qualquer
referência ao hub no código. Sem servidor próprio (RN puro — zero rotas de API); a autorização
real é RLS do Postgres.

- **Login online** — `app/src/app/(auth)/login.tsx:33` → `authStore.login`
  (`app/src/stores/authStore.ts:103`): resolve username→email via RPC `email_for_username`
  (SECURITY DEFINER, executável por `anon` — `app/supabase/rpc_email_for_username.sql`),
  depois `supabase.auth.signInWithPassword` (`authStore.ts:145`), depois busca
  `profiles.role` com fallback em cascata pro cache (`authStore.ts:149-160`).
- **Login offline** — se NetInfo diz offline, valida SHA-256(`nsa-pecuaria:username:password`)
  contra `OfflineCredCache` no AsyncStorage e entra em `offlineMode` sem JWT
  (`authStore.ts:111-138`). O hash cacheado **não tem TTL** — vale pra sempre; logout preserva
  o cache de propósito (`authStore.ts:244-247`).
- **Senha em plaintext** — com "lembrar" (default ON), a senha fica em plaintext no
  AsyncStorage (`authStore.ts:59` e `:167`), usada pra auto-preencher o form (`login.tsx:28`)
  e pro re-login silencioso do daemon quando volta rede (`app/src/lib/sync/daemon.ts:51-66`,
  `tryReAuthOffline`).
- **Gate de entrada é 100% client-side** — `app/src/app/index.tsx:25-29` redireciona por
  `isAuthenticated`, que a reidratação do Zustand persist seta só por existir `user` salvo
  (`authStore.ts:256-260`). Sem validação server-side no boot.
- **Níveis** — só 2: `'admin' | 'peao'` (`authStore.ts:52`; check constraint em
  `app/supabase/schema.sql:16`). Gates espalhados: tabs escondidas por role
  (`app/src/app/(tabs)/_layout.tsx`), `AdminLayout` redireciona peão
  (`app/src/app/admin/_layout.tsx:6-14` — obs: com `role` undefined ele não bloqueia),
  seções admin-only no Painel (`app/src/app/(tabs)/index.tsx`). Fallback pra `'peao'` em
  rede ruim (`authStore.ts:159`).
- **Sessão** — JWT supabase-js persistido no AsyncStorage (`persistSession: true`,
  `app/src/lib/supabase/client.ts:117-127`), refresh gerenciado pelo daemon conforme NetInfo.
- **Sem manifest** — o app não expõe `/api/nsa-access/manifest` (não tem como — não é web).
  O hub já trata este app como `IntegrationMode = manual`.

## 3. Contrato

**Fonte canônica: `../gestao-acessos/docs/protocolo-sso.md`.** Não invente nada além do que
está lá; dúvida de contrato → perguntar no hub.

Resumo (arquétipo web, pra referência — o fluxo mobile de F4 ainda será definido):

1. Satélite sem sessão → 302 pro `HUB/login?app=<slug>&redirect=<callback>`.
2. Usuário loga no hub; hub valida credencial + user Enabled + app Enabled + papel ativo,
   audita e emite **token de handoff selado, TTL 60s**.
3. Callback do satélite troca o token via `POST HUB/api/nsa-access/exchange`
   (`Authorization: Bearer NSA_ACCESS_SECRET`), recebe identidade e cria **sessão local
   própria** (iron-session, `SESSION_PASSWORD` própria).
4. Revalidação contínua via `POST HUB/api/nsa-access/lookup`
   (`{user_id, app_slug, session_version}`), cache ≤60s.

**Para mobile (F4):** a spec prevê "login in-app chama endpoint de token do hub (a criar na
F4); revalida `lookup` quando online". Esse endpoint **ainda não existe** — não implementar
nada contra ele. Atenção adicional: `NSA_ACCESS_SECRET` é server-only e um app Expo não tem
server — embutir o secret no bundle é proibido. A solução (BFF, endpoint dedicado mobile, ou
outra) sai do desenho da F4.

Env vars do contrato (satélites web hoje; a forma mobile será definida na F4):

| Var | Valor |
|---|---|
| `NSA_HUB_URL` | `https://gestao-acessos-nsa.netlify.app` |
| `NSA_ACCESS_SECRET` | mesmo valor do hub (64 hex). **Server-only, jamais em bundle de client / `EXPO_PUBLIC_*`** |
| `SESSION_PASSWORD` | própria do satélite (64 hex), não precisa ser igual à do hub |

Payload de identidade (retorno de `exchange`/`lookup`):

```json
{
  "user_id": "recXXXXXXXXXXXXXX",
  "username": "joao",
  "name": "João da Silva",
  "session_version": 3,
  "app_slug": "gestao-pecuaria",
  "is_global_admin": false,
  "levels": ["peao"],
  "roles": [{ "slug": "gestao-pecuaria-peao", "level": "peao", "scopes": ["gestao-pecuaria:peao"] }]
}
```

## 4. Mapa de níveis

Roles já semeados no Airtable do hub:

| Role no hub | `levels[]` no payload | Gate interno deste app |
|---|---|---|
| `gestao-pecuaria-admin` | `admin` | `role === 'admin'` (tabs Rebanho/Relatório, grupo `/admin`, seções do Painel) |
| `gestao-pecuaria-peao` | `peao` | acesso base |
| admin-global (Lucas) | `is_global_admin: true` | tratar como o nível mais alto (`admin`) |

## 5. Adaptação passo a passo

### Preparação que já pode ser feita (independe da F4 e da decisão de identidade)

1. **Centralizar a leitura de role num ponto único.**
   Hoje o role é lido direto de `useAuthStore((s) => s.user?.role)` em pelo menos:
   - `app/src/app/admin/_layout.tsx`
   - `app/src/app/(tabs)/_layout.tsx`
   - `app/src/app/(tabs)/index.tsx`

   Criar um helper único (ex: `app/src/lib/auth/level.ts` exportando `useUserLevel()` /
   `isAdmin()`), e fazer todos os gates consumirem ele. Motivo: quando a fonte do role trocar
   (profiles → payload do hub), muda-se **um** arquivo. Aproveitar pra fechar o buraco do
   `AdminLayout` com `role` undefined (undefined ≠ admin → bloquear). Nenhuma mudança de
   comportamento além desse fix.

2. **Migrar a senha do "lembrar" pra `expo-secure-store`** — pendência de segurança
   **independente da integração**; fazer já, sem esperar F4. Escopo:
   - `OfflineCredCache.password` (`authStore.ts:59`, `:167`) sai do AsyncStorage/Zustand
     persist e vai pro SecureStore (`expo-secure-store`).
   - Ajustar os consumidores: auto-preenchimento em `login.tsx:28` e
     `tryReAuthOffline` em `daemon.ts:51-66` passam a ler do SecureStore.
   - O hash de login offline pode continuar onde está (é hash, não segredo reutilizável fora
     do app), mas mover junto é aceitável se simplificar.
   - Incluir migração one-shot: se existir senha no cache antigo, mover pro SecureStore e
     apagar do AsyncStorage.

3. **Não fazer nada além disso agora.** Sem deep link de SSO, sem chamadas ao hub, sem campo
   de correlação Airtable↔Supabase, sem mexer no fluxo de login. Tudo isso depende da decisão
   de identidade adiada.

### Trabalho da F4 (NÃO executar agora — depende da decisão pós-piloto)

Dois cenários possíveis; o desenho exato sai depois do piloto web:

- **Cenário A — hub como fonte só de AUTORIZAÇÃO:** credencial continua no Supabase Auth;
  o app passa a consultar o `lookup` do hub (quando online) pra role/enabled/SessionVersion,
  substituindo `profiles.role` como fonte de nível. Exige campo de correlação
  `user_id` do hub (Airtable rec ID) ↔ uuid do `auth.users` — hoje inexistente.
- **Cenário B — credencial migra pro hub:** login in-app contra o endpoint mobile do hub
  (a criar na F4). Bloqueador conhecido: **toda a autorização de dados é RLS por
  `auth.uid()` do JWT Supabase** — sem JWT Supabase o sync inteiro quebra. Ou o hub passa a
  provisionar sessões Supabase, ou o sync muda de backend. Mudança grande; não subestimar.

Em ambos os cenários entram na F4: correlação de IDs, checagem de `enabled`/`SessionVersion`
no ciclo do daemon (ponto natural: `tryRun` em `daemon.ts`), forced-logout quando o lookup
disser `valid: false`, e restrição/aposentadoria da RPC `email_for_username` se o login sair
do app.

## 6. Regras não-negociáveis

- **Sem cópia local de Users** — a tabela SQLite `users` (`app/src/lib/db/schema.ts:43-49`,
  hoje morta) não pode virar espelho de identidade. Cache de sessão ≠ tabela de usuários.
- **Login só no hub** (quando a F4 chegar e conforme o cenário decidido) — satélite não
  mantém fluxo de credencial paralelo.
- **Cache de lookup ≤60s quando online.** Regra offline acordada pra este app: **a janela de
  60s é relaxada enquanto o device está offline**, mas a revalidação no `lookup` do hub é
  **obrigatória no próximo momento online** (o daemon de sync é o gancho). Janela de revogação
  efetiva = tempo offline do device — aceito e documentado. Enquanto isso, a barreira real de
  revogação continua sendo o RLS/ban no Supabase.
- **Rotas/ações sensíveis bypassam o cache** (lookup direto quando online).
- **Callback consome o token e redireciona** (limpa a URL/deep link — token não pode ficar em
  histórico ou log).
- **`SESSION_PASSWORD` própria do app**, nunca a do hub.
- **`NSA_ACCESS_SECRET` é server-only** — jamais em bundle Expo, `EXPO_PUBLIC_*` ou client.
- **Toda dúvida de contrato → perguntar no hub** (`../gestao-acessos`), não improvisar
  endpoints, campos ou comportamentos.

## 7. Validação

Pra qualquer mudança deste briefing (inclusive as preparações da seção 5):

1. `npx tsc --noEmit` no app (não há lint/test configurados neste repo).
2. Teste manual do fluxo em dev (`npm run start` / dev build): login online, login offline,
   "lembrar" com SecureStore, gates de role com `admin` e `peao`.
3. Quando o trabalho de F4 começar: o hub em dev aceita callback `localhost`
   (`NODE_ENV != production`) — testar o fluxo completo contra hub local antes de qualquer
   coisa em produção.
4. Regra de ouro herdada do hub: mudança que toque contrato/integração exige validação em
   preview antes de `main` — no caso deste app, build EAS de preview antes de release/OTA.
