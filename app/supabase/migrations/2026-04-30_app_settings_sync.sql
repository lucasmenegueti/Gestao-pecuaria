-- =====================================================================
-- Migration: app_settings sincronizada (schema v22 local)
-- Promove app_settings de tabela puramente local pra sincronizada via
-- Supabase. Admin liga/desliga alertas no /admin/alertas → push pro
-- Supabase → pull pros outros devices → todo mundo vê o mesmo painel.
--
-- Antes desse fix, cada device tinha sua própria cópia local. Lucas
-- desligou alertas no Tab S9 mas peões no campo continuaram vendo todos.
--
-- Rodar UMA VEZ no SQL Editor do Supabase. Idempotente.
-- =====================================================================

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  key text unique not null,
  value text not null,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_app_settings_key on app_settings(key);

-- Trigger pra atualizar updated_at automaticamente em UPDATEs.
drop trigger if exists app_settings_updated on app_settings;
create trigger app_settings_updated before update on app_settings
  for each row execute function tg_set_updated_at();

alter table app_settings enable row level security;

-- RLS: leitura universal (qualquer user autenticado lê config — peão precisa
-- saber thresholds de alerta pra avaliar mesmo offline). Write restrito a admin.
drop policy if exists app_settings_read on app_settings;
create policy app_settings_read on app_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists app_settings_ins on app_settings;
create policy app_settings_ins on app_settings
  for insert with check (is_admin());

drop policy if exists app_settings_upd on app_settings;
create policy app_settings_upd on app_settings
  for update using (is_admin())
  with check (is_admin());

drop policy if exists app_settings_del on app_settings;
create policy app_settings_del on app_settings
  for delete using (is_admin());

-- Defaults — mesma fonte de verdade do app/src/lib/db/schema.ts INSERT OR
-- IGNORE. ON CONFLICT(key) DO NOTHING torna idempotente: se rodar 2x ou se
-- algum admin já configurou um valor, não sobrescreve.
insert into app_settings (key, value) values
  ('fence.voltage_forte', '4000'),
  ('fence.voltage_adequado', '2000'),
  ('fence.voltage_fraco', '1'),
  ('alert.bombona.enabled', '1'),
  ('alert.bombona.warn_days', '3'),
  ('alert.bombona.danger_days', '0'),
  ('alert.central.enabled', '1'),
  ('alert.central.warn_days', '30'),
  ('alert.central.danger_days', '7'),
  ('alert.sanidade.enabled', '1'),
  ('alert.sanidade.warn_pct', '0'),
  ('alert.sanidade.danger_pct', '20'),
  ('alert.agua.enabled', '1'),
  ('alert.agua.warn_qualities', '["MEDIANA"]'),
  ('alert.agua.danger_qualities', '["RUIM"]'),
  ('alert.cerca.enabled', '1'),
  ('alert.cerca.warn_classifications', '["FRACO"]'),
  ('alert.cerca.danger_classifications', '["SEM CHOQUE"]'),
  ('alert.desalocados.enabled', '1'),
  ('alert.biologico.enabled', '1'),
  ('alert.biologico.weekday', '4')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
