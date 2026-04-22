-- =====================================================================
-- Migration: adicionar biological_water_evals (v0.5.5 do app, schema v19 local)
-- Rodar UMA VEZ no SQL Editor do Supabase. Idempotente.
-- =====================================================================

create table if not exists biological_water_evals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  ronda_id uuid not null references rondas(id) on delete cascade,
  applied boolean not null,
  quantity_g real,
  photo_uri text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists biological_water_evals_updated on biological_water_evals;
create trigger biological_water_evals_updated before update on biological_water_evals
  for each row execute function tg_set_updated_at();

alter table biological_water_evals enable row level security;

-- RLS: mesmo padrão dos demais *_evals. Autenticado lê tudo e insere; update
-- restrito ao criador (ou admin); delete só admin.
drop policy if exists biological_water_evals_read on biological_water_evals;
create policy biological_water_evals_read on biological_water_evals
  for select using (auth.role() = 'authenticated');

drop policy if exists biological_water_evals_ins on biological_water_evals;
create policy biological_water_evals_ins on biological_water_evals
  for insert with check (auth.role() = 'authenticated');

drop policy if exists biological_water_evals_upd on biological_water_evals;
create policy biological_water_evals_upd on biological_water_evals
  for update using (is_admin() or created_by = auth.uid())
  with check (is_admin() or created_by = auth.uid());

drop policy if exists biological_water_evals_del on biological_water_evals;
create policy biological_water_evals_del on biological_water_evals
  for delete using (is_admin());

-- Força reload do schema cache do PostgREST pra tabela nova aparecer sem
-- precisar reiniciar o projeto (efeito do "Could not find the table ... in the schema cache").
notify pgrst, 'reload schema';
