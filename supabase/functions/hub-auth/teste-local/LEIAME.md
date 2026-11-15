# Teste local da hub-auth (pecuária)

Três baterias, todas contra um Supabase LOCAL com o GoTrue na versão de produção e um hub
falso. Nada aqui toca produção nem o QA (o QA é a produção do Curral).

- `node --test ../regras.test.ts` — regras puras (17).
- `node integra.cjs` — a função: `/login`, `/check`, N:1 (`pedro` + `pedro.chaves`), níveis,
  atraso por usuário, falhas de infraestrutura (58).
- `node web-login.mjs --dist <export web>` — o app de verdade no Chrome headless: legado, hub,
  hub fora, virada legado→hub (mesma senha e senha diferente), revogação (14).

## Subir

1. Docker de pé (`colima start`). Projeto descartável numa pasta que o Docker enxergue
   (NÃO em /tmp): `supabase init`; no `config.toml`: `project_id = "pecg0"`, portas 563xx
   (api 56321, db 56322…), `[auth] enable_signup = false`, `[auth.email] enable_confirmations = true`
   (o `[auth.email] enable_signup` fica `true`: ele desliga o provedor inteiro);
   `echo v2.197.0 > supabase/.temp/gotrue-version` (conferir a de prod em `/auth/v1/health`).
2. `supabase start -x realtime,storage-api,imgproxy,studio,logflare,vector,supavisor,postgres-meta`
3. No banco (`docker exec -i supabase_db_pecg0 psql -U postgres -d postgres -v ON_ERROR_STOP=1`),
   nesta ordem: `base.sql` → `users.sql` → `app/supabase/migrations/2026-11-15_fase0_seguranca_auth.sql`
   → `app/supabase/migrations/2026-11-15_hub_auth_fase2.sql`. Os usuários de teste têm os MESMOS
   uuids de produção, então a migration da fase 2 roda sem alteração (rodá-la antes do
   `users.sql` prova a guarda: aborta sem criar nada).
4. Copiar `../index.ts` + `../regras.ts` para `supabase/functions/hub-auth/` do projeto
   descartável; `fn.env` com `NSA_HUB_URL=http://host.docker.internal:56999` e
   `NSA_ACCESS_SECRET=segredo-de-teste-local-0123456789abcdef`;
   `supabase functions serve hub-auth --no-verify-jwt --env-file fn.env`.
5. `node fakehub.mjs` (porta 56999).
6. Para o `web-login.mjs`, exportar a web SEM o `.env` (que aponta para o QA), de `app/`:
   `EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:56321 EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable local> npx expo export --platform web --output-dir <pasta> --clear`
   e conferir que o bundle cita `127.0.0.1:56321` e não cita QA nem prod.

## Dashboard

`node dashboard-login.mjs` (16): login nos dois modos, peão barrado, hub fora, renovação do
token (perto de vencer, vencido, refresh recusado) e revalidação no hub pelo middleware.
Precisa da stack, da função e do `fakehub` de pé, mais o dashboard apontando pra ela, de `dashboard/`:

```
SUPABASE_URL=http://127.0.0.1:56321 SUPABASE_ANON_KEY=<publishable local> \
SESSION_PASSWORD=senha-de-sessao-de-teste-local-0123456789-abcdefghij \
CURRAL_SUPABASE_URL= CURRAL_SUPABASE_ANON_KEY= npx next dev -p 3111
```

`CURRAL_SUPABASE_URL=` vazio é obrigatório: o `.env.local` aponta o Curral pro QA, e sem isso
cada login de teste bateria lá. As páginas dão 500 (a stack não tem as tabelas da pecuária);
o teste olha o cookie e o que o middleware respondeu.

## O que estas baterias NÃO cobrem

- A Worker da Cloudflare no caminho (IP visto pela função, CORS pela Worker).
- O hub de verdade (o `fakehub.mjs` segue o contrato, não o código do hub).
- Android e iOS nativos (AsyncStorage, NetInfo real, re-login na reconexão de rede).
- O schema da pecuária: a stack local só tem `profiles` e uma tabela de exemplo, então o sync
  de dados não é exercitado (só a decisão de entrar/sair).
