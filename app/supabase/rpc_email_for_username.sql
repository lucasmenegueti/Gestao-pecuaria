-- Função RPC pra mapear username → email. Necessária porque o Supabase Auth
-- loga por email, mas queremos que o peão digite só o username (ex.: "lucas").
-- Rodar UMA VEZ no SQL Editor do projeto Supabase.

create or replace function public.email_for_username(u text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select au.email::text
  from auth.users au
  join public.profiles p on p.id = au.id
  where lower(p.username) = lower(u)
  limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;
