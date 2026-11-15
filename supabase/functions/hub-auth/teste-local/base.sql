-- Base mínima do teste local: profiles, is_admin, handle_new_user, email_for_username e
-- os privilégios EXATAMENTE como estavam em produção em 2026-11-15 (antes da fase 0), mais
-- uma tabela com policy que chama is_admin() (o caso das 63 policies de prod).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text, name text, role text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create function public.is_admin() returns boolean language sql stable as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;
create policy profiles_read on public.profiles for select using (auth.role() = 'authenticated');
create policy profiles_update_self on public.profiles for update
  using ((auth.uid() = id) or public.is_admin()) with check ((auth.uid() = id) or public.is_admin());
grant all on public.profiles to anon, authenticated, service_role;

create function public.handle_new_user() returns trigger language plpgsql security definer as $function$
begin
  insert into public.profiles (id, username, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'peao')
  );
  return new;
end $function$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.email_for_username(u text) returns text language sql security definer
set search_path = public, auth as $$
  select au.email::text from auth.users au join public.profiles p on p.id = au.id
  where lower(p.username) = lower(u) limit 1;
$$;
grant execute on function public.email_for_username(text) to anon, authenticated;

create table public.formulas_teste (id int primary key, nome text);
alter table public.formulas_teste enable row level security;
create policy formulas_teste_admin on public.formulas_teste for all using (public.is_admin()) with check (public.is_admin());
grant all on public.formulas_teste to anon, authenticated, service_role;
insert into public.formulas_teste values (1, 'sal');
