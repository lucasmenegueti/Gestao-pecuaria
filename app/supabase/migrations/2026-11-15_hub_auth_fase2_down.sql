-- Reversão da fase 2 (2026-11-15_hub_auth_fase2.sql). Regra LIFO do plano: só rodar com as fases
-- 3+ fora do ar (nenhum usuário em modo 'hub' e nenhum app chamando auth_mode/hub-auth).
-- Guarda: recusa se alguém estiver em modo 'hub'.

begin;

do $$
begin
  if exists (select 1 from public.auth_config where modo = 'hub') then
    raise exception 'há usuário em modo hub: volte todos para legado antes de reverter a fase 2';
  end if;
end $$;

drop function if exists public.auth_mode(text);
drop table if exists public.auth_tentativas;
drop table if exists public.hub_sessoes;
drop table if exists public.auth_config;
drop table if exists public.hub_vinculos;

commit;
