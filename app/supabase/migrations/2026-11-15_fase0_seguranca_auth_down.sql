-- Reversão da fase 0 (2026-11-15_fase0_seguranca_auth.sql).
-- Devolve handle_new_user e os privilégios de profiles ao estado capturado em prod em
-- 15/11/2026, antes da migration. Reabre os dois furos — usar só se algo quebrar.
-- (O signup público é religado no painel, se for o caso.)

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
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

grant all on table public.profiles to anon, authenticated;

commit;
