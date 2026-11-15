-- Fase 2 da migração do login para o hub gestao-acessos (BRIEFING-INTEGRACAO-ACESSOS.md §4).
-- Molde: ../gestao-agricultura/app/supabase/hub-auth-fase3.sql. Aplicada em produção em 2026-11-15 (OK do Lucas).
--
-- 100% ADITIVA: só cria objetos novos. App, dashboard, relatório e Curral seguem idênticos.
-- Reversão: 2026-11-15_hub_auth_fase2_down.sql.
--
-- - hub_vinculos: uuid do Supabase → user_id do hub (recXXX). Tabela PRIVADA. Diferente do
--   agricultura, hub_user_id NÃO é unique: `pedro` e `pedro.chaves` são a mesma pessoa e
--   apontam para o mesmo usuário do hub (N:1).
-- - auth_config: modo de login por username ('legado' = login direto de hoje; 'hub' = via
--   Edge Function hub-auth). Linha '*' = padrão. Nasce tudo em 'legado'.
-- - auth_mode(username): única peça exposta ao app (anon). Username desconhecido → 'legado'
--   (não vira oráculo de quais usernames existem).
-- - hub_sessoes: sessões GoTrue emitidas pela hub-auth (base do /check).
-- - auth_tentativas: atraso progressivo no /login (nunca guarda senha).
--
-- Onde aplicar: produção (fxtescythawmbwkthbyb). O QA não entra nesta rodada.

begin;

create table public.hub_vinculos (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  hub_user_id  text not null,
  criado_em    timestamptz not null default now()
);
create index hub_vinculos_hub_idx on public.hub_vinculos (hub_user_id);

create table public.auth_config (
  chave         text primary key,              -- username (minúsculo) ou '*'
  modo          text not null default 'legado' check (modo in ('legado', 'hub')),
  atualizado_em timestamptz not null default now()
);
insert into public.auth_config (chave, modo) values ('*', 'legado');

create table public.hub_sessoes (
  session_id          uuid primary key,        -- claim session_id do JWT emitido
  auth_user_id        uuid not null references auth.users(id) on delete cascade,
  hub_user_id         text not null,
  session_version     integer not null,
  criado_em           timestamptz not null default now(),
  ultimo_check_em     timestamptz,
  ultimo_check_valido boolean
);
create index hub_sessoes_user_idx on public.hub_sessoes (auth_user_id);

create table public.auth_tentativas (
  id        bigserial primary key,
  username  text,
  ip        text,
  sucesso   boolean not null,
  criado_em timestamptz not null default now()
);
create index auth_tentativas_user_idx on public.auth_tentativas (username, criado_em desc);
create index auth_tentativas_ip_idx   on public.auth_tentativas (ip, criado_em desc);

-- Privadas: RLS ligado sem policy + sem grant pros clientes. Só service_role (a função).
alter table public.hub_vinculos    enable row level security;
alter table public.auth_config     enable row level security;
alter table public.hub_sessoes     enable row level security;
alter table public.auth_tentativas enable row level security;
revoke all on public.hub_vinculos, public.auth_config, public.hub_sessoes, public.auth_tentativas
  from public, anon, authenticated;
revoke all on sequence public.auth_tentativas_id_seq from public, anon, authenticated;
grant all on public.hub_vinculos, public.auth_config, public.hub_sessoes, public.auth_tentativas
  to service_role;
grant usage, select on sequence public.auth_tentativas_id_seq to service_role;

create function public.auth_mode(u text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (select 1 from public.profiles p where lower(p.username) = lower(trim(u))) then 'legado'
    else coalesce(
      (select c.modo from public.auth_config c where c.chave = lower(trim(u))),
      (select c.modo from public.auth_config c where c.chave = '*'),
      'legado')
  end
$$;
revoke all on function public.auth_mode(text) from public;
grant execute on function public.auth_mode(text) to anon, authenticated, service_role;

-- Vínculos (uuid do Supabase → user_id do hub), passados pela sessão do hub em 2026-11-15
-- depois de criar os usuários lá. Por uuid, nunca por username: o `pedro` do hub é outra
-- pessoa. gabriel e relatorio não têm vínculo (ficam fora do hub).
-- Guarda: aborta a migration inteira se algum uuid não existir em auth.users.
do $$
declare
  faltando text;
begin
  with v(auth_user_id, hub_user_id) as (values
    ('4f9f9fd3-2aee-4acc-a96f-793fab4c6cfa'::uuid, 'rec7x0JSk7vDyMdcy'),  -- lucas
    ('4659e45f-69e5-4dd6-adce-fcf79553713e'::uuid, 'recyIMtKR22QpWmQ4'),  -- alex
    ('9a559607-0180-4c93-81c5-be256bba2f82'::uuid, 'rec4wsFkI9dH01yjQ'),  -- pedro.chaves
    ('1165411f-da55-4f5f-a952-1bce6d350388'::uuid, 'rec4wsFkI9dH01yjQ'),  -- pedro (mesma pessoa)
    ('34b59578-229b-4489-9264-e0bf3a7b250c'::uuid, 'recmeAvY3zfMbo7rB'),  -- vaqueiro
    ('789bf03b-6c85-41b2-beca-d1375507bdfe'::uuid, 'rec94m3AUEnAwJTQt'),  -- bruno
    ('2a12a4cf-3dcd-40bb-b716-99de60fc8fc9'::uuid, 'recjUXvvxwQTwHK9t')   -- rafael
  )
  select string_agg(v.auth_user_id::text, ', ') into faltando
  from v where not exists (select 1 from auth.users u where u.id = v.auth_user_id);
  if faltando is not null then
    raise exception 'hub_vinculos: uuid ausente em auth.users: %', faltando;
  end if;

  insert into public.hub_vinculos (auth_user_id, hub_user_id) values
    ('4f9f9fd3-2aee-4acc-a96f-793fab4c6cfa', 'rec7x0JSk7vDyMdcy'),
    ('4659e45f-69e5-4dd6-adce-fcf79553713e', 'recyIMtKR22QpWmQ4'),
    ('9a559607-0180-4c93-81c5-be256bba2f82', 'rec4wsFkI9dH01yjQ'),
    ('1165411f-da55-4f5f-a952-1bce6d350388', 'rec4wsFkI9dH01yjQ'),
    ('34b59578-229b-4489-9264-e0bf3a7b250c', 'recmeAvY3zfMbo7rB'),
    ('789bf03b-6c85-41b2-beca-d1375507bdfe', 'rec94m3AUEnAwJTQt'),
    ('2a12a4cf-3dcd-40bb-b716-99de60fc8fc9', 'recjUXvvxwQTwHK9t');
end $$;

commit;
