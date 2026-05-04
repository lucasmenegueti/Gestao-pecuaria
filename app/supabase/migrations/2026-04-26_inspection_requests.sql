-- =====================================================================
-- Migration: inspection_requests (schema v20 local)
-- Admin delega ao peão quais piquetes precisam de inspeção "sob demanda"
-- (bombona, forragem, biologico, sanidade, peso_visual, lavagem).
-- Solicitações são genéricas — qualquer peão resolve. Auto-completam quando
-- o peão preenche aquela seção da ronda no piquete.
-- Rodar UMA VEZ no SQL Editor do Supabase. Idempotente.
-- =====================================================================

create table if not exists inspection_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  paddock_id uuid not null references paddocks(id) on delete cascade,
  eval_kind text not null check (eval_kind in (
    'bombona','forragem','biologico','sanidade','peso_visual','lavagem'
  )),
  requested_by uuid not null references auth.users(id),
  notes text,
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_insp_req_paddock_status on inspection_requests(paddock_id, status);
create index if not exists idx_insp_req_status on inspection_requests(status);

drop trigger if exists inspection_requests_updated on inspection_requests;
create trigger inspection_requests_updated before update on inspection_requests
  for each row execute function tg_set_updated_at();

alter table inspection_requests enable row level security;

-- RLS: leitura livre p/ autenticados; criação só admin; update qualquer
-- autenticado (peão precisa marcar como completed); delete só admin.
drop policy if exists inspection_requests_read on inspection_requests;
create policy inspection_requests_read on inspection_requests
  for select using (auth.role() = 'authenticated');

drop policy if exists inspection_requests_ins on inspection_requests;
create policy inspection_requests_ins on inspection_requests
  for insert with check (is_admin());

drop policy if exists inspection_requests_upd on inspection_requests;
create policy inspection_requests_upd on inspection_requests
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists inspection_requests_del on inspection_requests;
create policy inspection_requests_del on inspection_requests
  for delete using (is_admin());

notify pgrst, 'reload schema';
