-- Contas do teste com os MESMOS uuids de produção (a migration da fase 2 roda sem alteração).
-- Senhas e e-mails são de teste. rafael: e-mail inválido e sem identity, como em prod.
create or replace function pg_temp.mk(p_id uuid, p_user text, p_email text, p_pw text, p_ident boolean) returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email, extensions.crypt(p_pw, extensions.gen_salt('bf', 6)), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('username', p_user, 'name', initcap(p_user)), now(), now(), '', '', '', '', '', '', '', '');
  if p_ident then
    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    values (p_id::text, p_id, jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), 'email', now(), now(), now());
  end if;
end $$;
select pg_temp.mk('4f9f9fd3-2aee-4acc-a96f-793fab4c6cfa', 'lucas',        'lucas@nsa.teste',        'Supa-Lucas-1',  true);
select pg_temp.mk('4659e45f-69e5-4dd6-adce-fcf79553713e', 'alex',         'alex@nsa.teste',         'Supa-Alex-2',   true);
select pg_temp.mk('9a559607-0180-4c93-81c5-be256bba2f82', 'pedro.chaves', 'pedro.chaves@nsa.teste', 'Supa-PedroC-3', true);
select pg_temp.mk('1165411f-da55-4f5f-a952-1bce6d350388', 'pedro',        'pedro@nsa.teste',        'Supa-Pedro-4',  true);
select pg_temp.mk('34b59578-229b-4489-9264-e0bf3a7b250c', 'vaqueiro',     'vaqueiro@nsa.teste',     'Supa-Vaq-5',    true);
select pg_temp.mk('789bf03b-6c85-41b2-beca-d1375507bdfe', 'bruno',        'bruno@nsa.teste',        'Supa-Bruno-6',  true);
select pg_temp.mk('2a12a4cf-3dcd-40bb-b716-99de60fc8fc9', 'rafael',       'rafael',                 'Supa-Rafael-7', false);
select pg_temp.mk('a30d182a-0000-4000-8000-000000000001', 'gabriel',      'gabriel@nsa.teste',      'Supa-Gabriel-8', true);
select pg_temp.mk('af78fddd-0000-4000-8000-000000000002', 'relatorio',    'relatorio@nsa.teste',    'Supa-Relat-9',  true);
update public.profiles set role = 'admin' where username in ('lucas','alex','pedro.chaves','pedro','gabriel','relatorio');
select string_agg(username || ':' || role, ' ' order by username) from public.profiles;
