-- Fase 0 da migração do login para o hub gestao-acessos (BRIEFING-INTEGRACAO-ACESSOS.md §4)
-- Segurança do Auth/profiles. Aplicada em produção em 2026-11-15 (OK do Lucas), com ensaio em transação revertida antes.
--
-- O que estava aberto (levantado em prod em 15/11/2026):
--   1. handle_new_user copiava `role` de raw_user_meta_data → um cadastro com
--      {"role":"admin"} na metadata nascia admin.
--   2. profiles: anon e authenticated tinham TODOS os privilégios, e a policy
--      profiles_update_self (auth.uid() = id OR is_admin()) não restringe coluna →
--      qualquer usuário logado podia trocar o próprio `role` para admin.
--
-- O que muda:
--   - handle_new_user grava sempre role 'peao'. Promover a admin passa a ser um UPDATE
--     feito por SQL (painel/MCP), nunca pelo cadastro.
--   - profiles vira SOMENTE LEITURA para os clientes: anon e authenticated ficam só com
--     SELECT. O SELECT de anon FICA de propósito: is_admin() não é security definer e lê
--     profiles com o papel de quem chama, e 63 policies a usam — sem o privilégio, um
--     request anon (aparelho com sessão morta tentando sincronizar) passaria de `200 []`
--     para "permission denied". A policy profiles_read já esconde as linhas de anon.
--     Conferido por código em 15/11: app (authStore.ts:83), dashboard (users-lookup.ts:130),
--     scripts de ops e Curral (authStore.ts:83) só fazem SELECT em profiles; o relatório
--     diário não toca na tabela. Ninguém usa signUp nem a API de admin.
--   - Policies NÃO mudam (profiles_read, profiles_update_self ficam como estão; sem o
--     privilégio de UPDATE a segunda deixa de ter efeito). Menos peças para reverter.
--   - email_for_username NÃO muda: o login direto (modo legado) depende dela para anon.
--
-- Fora desta migration (painel, feito pelo Lucas): Authentication › Sign In / Providers ›
-- desligar "Allow new users to sign up".
--
-- Onde aplicar: produção (fxtescythawmbwkthbyb). No QA (zmetxajiimsclhuhaykv) só com OK
-- do Lucas — o QA é a produção de fato do Curral.
-- Reversão: 2026-11-15_fase0_seguranca_auth_down.sql.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, username, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'peao'
  );
  return new;
end $function$;

-- EXECUTE de handle_new_user fica como está: função de trigger não é chamável por RPC, e
-- mexer no grant arriscaria o disparo pelo supabase_auth_admin sem ganho de segurança.

revoke insert, update, delete, truncate, references, trigger on table public.profiles from anon, authenticated;

commit;
