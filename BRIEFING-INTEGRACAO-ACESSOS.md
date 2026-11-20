# Briefing — Migração do login do gestao-pecuaria pro hub gestao-acessos

Escrito pelo agente do hub (`../gestao-acessos`) pro agente deste repo. **Reescrito em
2026-11-15** com o levantamento que este repo fez no mesmo dia (substitui a versão de julho).
Contrato: `../gestao-acessos/docs/protocolo-sso.md` › "Login in-app via BFF". Molde já em
produção: `../gestao-acessos/docs/plano-migracao-agricultura.md` (§0 prevalece) e o código de
`../gestao-agricultura` (`supabase/functions/hub-auth`, authStore, sync). Dúvida de contrato →
perguntar no hub, não improvisar.

## 1. Objetivo e requisito do Lucas

O hub passa a decidir **quem entra** (senha, habilitado, nível). O Supabase da pecuária
continua **emitindo a sessão pro mesmo uuid** — RLS, sync, SQLite e fotos não mudam.

Requisito literal: *"Não gostaria de mudar a senha de ninguém, para o usuário deve ser
totalmente clean a migração."* Na prática: mesma tela, mesmo usuário, mesma senha, sem
binário novo (OTA), sem perder pendentes, e offline funcionando como hoje.

```
app / dashboard ─ usuário+senha ─▶ Edge Function hub-auth (Supabase pecuária fxtescythawmbwkthbyb)
                                     1. username local → uuid → hub_vinculos.hub_user_id
                                     2. POST HUB/api/nsa-access/authenticate {user_id, password, app_slug}
                                     3. nível do hub × profiles.role (diferente → recusa, nunca reescreve)
                                     4. GoTrue emite sessão real pro uuid (generateLink → verify)
◀──── {access_token, refresh_token, identidade do hub} ─┘
```

## 2. Decisões do Lucas (2026-11-15)

| Tema | Decisão |
|---|---|
| Senha de quem só existe na pecuária | hash bcrypt copiado pro hub → **mesma senha** |
| Senha de quem já tem conta no hub (`lucas`, `alex`) | **vale a senha do hub** (ele avisa a pessoa) |
| `pedro` e `pedro.chaves` | **corrigido em 18/11/2026:** são duas pessoas — `pedro` = Pedro Leite, `pedro.chaves` = Pedro Chaves. A decisão original ("mesma pessoa") estava errada e o vínculo do `pedro` foi religado |
| `vaqueiro` | mantém o login como está |
| `bruno`, `rafael` | **continuam** (migram) |
| `gabriel` | é o Gabriel desabilitado no hub desde 29/09; **fica em `legado`** até o Lucas decidir |
| `relatorio` (robô) | fora do hub, `legado` permanente |
| Fase 0 de segurança no Supabase | **aprovada** — fazer antes de tudo |
| Dashboard | mantém a tela própria; usa `app_slug: "gestao-pecuaria"` exigindo nível `admin`; o app `gestao-pecuaria-dashboard` do hub será aposentado |

## 3. Quem é quem (vínculo conta local → usuário do hub)

| Conta local (uuid) | role | Usuário do hub | Senha no modo hub |
|---|---|---|---|
| `lucas` `4f9f9fd3-2aee-4acc-a96f-793fab4c6cfa` | admin | `lucas` `rec7x0JSk7vDyMdcy` (admin-global) | a do hub |
| `alex` `4659e45f-69e5-4dd6-adce-fcf79553713e` | admin | `alex` `recyIMtKR22QpWmQ4` | a do hub |
| `pedro.chaves` `9a559607-0180-4c93-81c5-be256bba2f82` | admin | `pedro.chaves` (novo) | a de hoje da conta `pedro.chaves` |
| `pedro` `1165411f-da55-4f5f-a952-1bce6d350388` | admin | o MESMO `pedro.chaves` | **a da conta `pedro.chaves`** (ver abaixo) |
| `vaqueiro` `34b59578-229b-4489-9264-e0bf3a7b250c` | peao | `vaqueiro` (novo) | a de hoje |
| `bruno` `789bf03b-6c85-41b2-beca-d1375507bdfe` | peao | `bruno` (novo) | a de hoje |
| `rafael` `2a12a4cf-3dcd-40bb-b716-99de60fc8fc9` | peao | `rafael` (novo) | a de hoje |
| `gabriel` | admin | — (legado) | a do Supabase |
| `relatorio` | admin | — (legado, robô) | a do Supabase |

Os `user_id` dos novos saem do `scripts/migrar-pecuaria.ts` do hub quando aplicado (te passo).

**Três consequências que o desenho tem de respeitar:**

1. **O `pedro` do hub é OUTRA pessoa** (Pedro Leite, estoque/mecânica). Por isso a função
   **nunca** manda o username pro hub: resolve username local → uuid → `hub_user_id` e chama o
   `/authenticate` com **`user_id`** (suporte novo no hub, PR #17). Mandar `login: "pedro"`
   autenticaria a pessoa errada.
2. **Vínculo N:1** — duas contas locais apontam pro mesmo usuário do hub. `hub_vinculos` tem
   `auth_user_id` como PK e `hub_user_id` **sem unique** (diferente do agricultura). O hub
   guarda UMA senha por pessoa: no modo hub, a conta `pedro` passa a aceitar a senha da conta
   `pedro.chaves`. Se hoje forem diferentes, é a única mudança visível — o Lucas sabe.
3. **`rafael` tem e-mail inválido e 0 identities** — `generateLink` falha. Corrigir o e-mail
   dele no `auth.users` pra um formato válido (sem mexer na senha) antes de virar a conta pra
   `hub`; até lá fica em `legado`.

## 4. Fases (LIFO: reverter da mais alta pra mais baixa)

| # | Fase | Quem | O usuário percebe? | Reversão |
|---|---|---|---|---|
| **0** | **Segurança Supabase** (prod; QA só com OK do Lucas — o QA é a produção do Curral): Lucas desliga "Allow new users to sign up" no painel; migration: `handle_new_user` com role fixo `peao`, tirar o `role` do alcance do próprio usuário (`profiles_update_self` sem coluna `role`, ou revoke + policy só admin), revoke de escrita de anon em `profiles`. Conferir antes que app, dashboard, relatório e Curral só LEEM `profiles` | pecuária + Lucas | não | `_down.sql` com ACL/função capturados antes |
| **1** | **Hub**: PR #17 (`user_id` no `/authenticate`), segredo dedicado `NSA_ACCESS_SECRET__GESTAO_PECUARIA`, usuários + papéis (`migrar-pecuaria.ts`) | hub | não | revogar papéis pelo console |
| **2** | **Supabase**: migration aditiva — `hub_vinculos`, `auth_config` (modo `legado\|hub` por conta, default `legado`), RPC `auth_mode(username)` (anon; devolve `legado` pra desconhecido), `hub_sessoes`, `auth_tentativas`; tudo sem grant pra anon/authenticated. Edge Function `hub-auth` (`/login`, `/check`) publicada **com todo mundo em `legado`** | pecuária | não | apagar a função + `_down.sql` |
| **3** | **Cliente por OTA + web**: app consulta `auth_mode`; `legado` = caminho de hoje; `hub` = `hub-auth/login` → `setSession`. Re-login silencioso do daemon usa o mesmo caminho. `/check` no ciclo do sync (best-effort). Fallback direto só por rede/5xx/404 | pecuária | não | OTA anterior / republicar a web |
| **4** | **Dashboard**: server action chama `hub-auth/login` no modo hub (mesma tela, mesma senha); o segundo grant no Curral continua com a senha digitada | pecuária | não | republicar o deploy anterior |
| **5** | **Liga o hub pessoa a pessoa** (`auth_config`): lucas → pedro.chaves/pedro → alex → vaqueiro → bruno → rafael | hub + pecuária + Lucas | não (lucas/alex: senha do hub) | `update auth_config set modo='legado'` (segundos) |
| **6** | **Fechamento** (depois, com gate): login direto fechado pra quem está em `hub`; `gabriel` decidido; chaves novas | — | — | — |

## 5. Regras do desenho (não-negociáveis)

- **O uuid não muda.** A função nunca cria usuário no Auth; o e-mail do `generateLink` sai
  sempre do próprio `auth.users` (e-mail inexistente viraria signup — por isso a fase 0 vem antes).
- **Veredito do `/authenticate`:** só são veredito 200, 401 `invalid_credentials` e 403
  `user_disabled | no_role | app_disabled`. Todo o resto (401 `unauthorized`, 400, 5xx, timeout)
  vira **503 "tente de novo"** — erro de config nunca vira "senha errada".
- **`/check`:** uuid vem do JWT do chamador; `hub_user_id`/`session_version` vêm do banco;
  lookup no hub no máximo 1×/60 s por usuário; derruba só com `reason` em lista fechada
  (`user_disabled`, `no_role`, `session_version_mismatch`, `user_not_found`, `app_disabled`)
  repetido num 2º lookup imediato; revoga só a sessão do chamador; em `legado` é no-op.
- **Níveis:** hub `admin` ou `is_global_admin` ⇒ `admin`; hub `peao` ⇒ `peao`. Diferente do
  `profiles.role` ⇒ recusa `role_mismatch`. **Nunca reescrever `profiles.role`.**
- **Offline é requisito duro:** o verificador local (SHA-256) e o re-login silencioso continuam.
  Linhas `pending_sync` nunca são apagadas por `valid:false`, 503 ou troca de modo. 503/timeout
  do `/check` nunca impede push nem pull.
- **Só OTA:** nenhuma dependência nativa nova (`expo-secure-store` fica fora desta rodada) e
  sem `version` novo no persist do Zustand.
- **Proxy:** o app chama `…workers.dev/functions/v1/hub-auth`; a função fala direto com o hub.
- **Função:** `verify_jwt=false` com autorização no código; deploy por `--project-ref`, **sem
  `supabase link`, `db push` nem `config push`**; secrets lidos de forma lazy (modo legado
  funciona sem o segredo); CORS pros domínios web (app e dashboard); rate-limit/atraso
  progressivo por usuário e IP (obrigação do BFF pela spec); senha nunca em log.
- **Segredo:** `NSA_ACCESS_SECRET` da função = o dedicado `NSA_ACCESS_SECRET__GESTAO_PECUARIA`
  do hub (vale só com `app_slug: "gestao-pecuaria"`, em `/authenticate` e `/lookup`). Eu gravo
  no Supabase pelo script do hub; nunca em bundle, `EXPO_PUBLIC_*` ou repo.
- **Testar local** (`supabase start` em diretório descartável, GoTrue v2.197.0 = prod), não
  no branch QA.
- **Robôs e legado:** `relatorio` e `gabriel` ficam em `legado`; o caminho direto
  (`email_for_username` + password grant) continua vivo nesta rodada.

## 6. Contrato do hub que a função usa

`POST https://gestao-acessos-nsa.netlify.app/api/nsa-access/authenticate`
`Authorization: Bearer <segredo dedicado>`
body `{ "user_id": "rec…", "password": "…", "app_slug": "gestao-pecuaria" }`
→ 200 `{ ok, user: { user_id, username, name, session_version, app_slug, is_global_admin, levels, roles } }`
· 401 `invalid_credentials` · 403 `user_disabled | no_role | app_disabled` · 400 · 503 `unavailable`.

`POST …/api/nsa-access/lookup` body `{ user_id, app_slug: "gestao-pecuaria", session_version }`
→ 200 `{ ok, valid: true, user }` · 200 `{ ok, valid: false, reason }` · 503.

O `user_id` no `/authenticate` só existe depois do PR #17 do hub estar em produção (aviso).

## 7. Validação por fase

- Fase 0: app (login online/offline, sync), dashboard, relatório e Curral seguem funcionando;
  signup com `role: admin` na metadata não vira admin; usuário não consegue mudar o próprio role.
- Fase 2: testes da função pra todos os ramos (200, 401, 403, 503, `role_mismatch`,
  `sem_vinculo`, `modo_legado`), ciclo up→down→up da migration, `has_table_privilege(anon…)=false`.
- Fase 3/4: com todos em `legado`, login + sync + offline idênticos a hoje em Android, iOS, web
  e dashboard.
- Fase 5 (por pessoa): login online, login offline, re-login silencioso, sync com pendentes,
  desabilitar no hub → sessão cai em ≤60 s online, hub fora → "tente de novo" sem derrubar ninguém.

## 8. Fora desta rodada (com prazo próprio)

- **Chaves legadas do Supabase morrem em 31/12/2026**: app (OTA + web), dashboard, relatório e
  Curral usam anon JWT `eyJ…`. Trilha separada; a `hub-auth` já nasce com chave nova.
- Senha em claro no AsyncStorage/localStorage ("lembrar") — depende de binário novo (SecureStore).
- Rotacionar a senha do `lucas` que está no histórico git: só DEPOIS da virada dele pra `hub`
  (aí a do Supabase deixa de ser a porta).
- Curral (`../curral-nsa`): outro app, outro projeto; não entra agora.
