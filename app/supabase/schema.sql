-- =====================================================================
-- Gestão Pecuária NSA — Supabase schema
-- Rodar UMA VEZ no SQL Editor do projeto Supabase.
-- Pressupõe extensão pgcrypto já disponível (Supabase habilita por padrão).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles: espelho de auth.users com role e nome de exibição
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  role text not null default 'peao' check (role in ('peao','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger para criar profile quando um novo auth.user aparece.
-- Requer que o admin crie com raw_user_meta_data = {username, name, role}.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'peao')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: role do JWT atual
create or replace function public.current_role()
returns text language sql stable as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- Helper: trigger reutilizável para atualizar updated_at
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------
-- Catálogos: grass_types, formulas, paddocks, water_tanks, farm_boundaries
-- Leitura livre p/ autenticados; escrita só admin.
-- ---------------------------------------------------------------------
create table if not exists grass_types (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  name text unique not null,
  entry_height_cm real not null,
  exit_height_cm real not null,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger grass_types_updated before update on grass_types
  for each row execute function tg_set_updated_at();

create table if not exists formulas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  name text unique not null,
  kg_per_sack real not null,
  -- gramas de ração por kg de peso vivo por dia.
  -- Consumo diário = Σ (cab × peso_vivo_kg) × target_g_per_kg_body_day / 1000
  target_g_per_kg_body_day real not null,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger formulas_updated before update on formulas
  for each row execute function tg_set_updated_at();

create table if not exists paddocks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  name text not null,
  area_hectares real not null,
  grass_type_id uuid references grass_types(id),
  latitude real,
  longitude real,
  center_lat real,
  center_lng real,
  geometry jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger paddocks_updated before update on paddocks
  for each row execute function tg_set_updated_at();

create table if not exists water_tanks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  name text not null,
  lat real not null,
  lng real not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger water_tanks_updated before update on water_tanks
  for each row execute function tg_set_updated_at();

create table if not exists farm_boundaries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  name text not null,
  geometry jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger farm_boundaries_updated before update on farm_boundaries
  for each row execute function tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Rebanho (herd) + herd_events
-- ---------------------------------------------------------------------
create table if not exists herd (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  paddock_id uuid references paddocks(id),
  category text not null,
  head_count integer not null,
  avg_weight_kg real,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger herd_updated before update on herd
  for each row execute function tg_set_updated_at();
create unique index if not exists idx_herd_alloc on herd(paddock_id, category)
  where paddock_id is not null and deleted_at is null;
create unique index if not exists idx_herd_pool on herd(category)
  where paddock_id is null and deleted_at is null;

create table if not exists herd_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  paddock_id uuid references paddocks(id),
  event_type text not null,
  category text not null,
  head_count integer not null,
  target_paddock_id uuid references paddocks(id),
  notes text,
  date date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger herd_events_updated before update on herd_events
  for each row execute function tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Rondas + evaluations (append-only-ish)
-- ---------------------------------------------------------------------
create table if not exists rondas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  paddock_id uuid not null references paddocks(id),
  user_id uuid not null references auth.users(id),
  date date not null default current_date,
  completed boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger rondas_updated before update on rondas
  for each row execute function tg_set_updated_at();

create table if not exists supplement_evals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  ronda_id uuid not null references rondas(id) on delete cascade,
  trough_score text not null,
  restocked boolean not null default false,
  formula_id uuid references formulas(id),
  sacks_in_trough real,
  trough_access text not null default 'BOM',
  photo_uri text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger supplement_evals_updated before update on supplement_evals
  for each row execute function tg_set_updated_at();

create table if not exists bombona_evals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  ronda_id uuid not null references rondas(id) on delete cascade,
  has_stock boolean not null,
  formula_id uuid references formulas(id),
  sacks real,
  photo_uri text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger bombona_evals_updated before update on bombona_evals
  for each row execute function tg_set_updated_at();

create table if not exists forage_evals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  ronda_id uuid not null references rondas(id) on delete cascade,
  measurement_type text not null,
  measure_1_cm real not null,
  measure_2_cm real not null,
  measure_3_cm real not null,
  average_cm real not null,
  quality text not null,
  photo_uri text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger forage_evals_updated before update on forage_evals
  for each row execute function tg_set_updated_at();

create table if not exists water_evals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  ronda_id uuid not null references rondas(id) on delete cascade,
  available boolean not null,
  quality text,
  photo_uri text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger water_evals_updated before update on water_evals
  for each row execute function tg_set_updated_at();

create table if not exists health_evals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  ronda_id uuid not null references rondas(id) on delete cascade,
  parasite_free boolean not null,
  affected_pct real,
  observations text,
  photo_uri text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger health_evals_updated before update on health_evals
  for each row execute function tg_set_updated_at();

create table if not exists fence_evals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  ronda_id uuid not null references rondas(id) on delete cascade,
  voltage real not null,
  is_electric boolean not null default true,
  prevents_mixing boolean not null,
  classification text not null,
  photo_uri text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger fence_evals_updated before update on fence_evals
  for each row execute function tg_set_updated_at();

create table if not exists visual_weight_evals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  ronda_id uuid not null references rondas(id) on delete cascade,
  category text not null,
  estimated_weight_kg real not null,
  previous_weight_kg real,
  previous_date date,
  photo_uri text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger visual_weight_evals_updated before update on visual_weight_evals
  for each row execute function tg_set_updated_at();

create table if not exists washing_evals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  ronda_id uuid not null references rondas(id) on delete cascade,
  was_washed boolean not null,
  photo_uri text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger washing_evals_updated before update on washing_evals
  for each row execute function tg_set_updated_at();

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
create trigger biological_water_evals_updated before update on biological_water_evals
  for each row execute function tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Estoque (inventory) + reabastecimento
-- ---------------------------------------------------------------------
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  formula_id uuid not null references formulas(id),
  quantity_sacks real not null default 0,
  min_sacks real not null default 0,
  location text not null default 'central' check (location in ('central','bombona')),
  paddock_id uuid references paddocks(id),
  last_resupply_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger inventory_updated before update on inventory
  for each row execute function tg_set_updated_at();

create table if not exists resupply_routes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  user_id uuid not null references auth.users(id),
  start_time timestamptz not null,
  end_time timestamptz,
  status text not null default 'loading' check (status in ('loading','in_progress','completed','cancelled')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger resupply_routes_updated before update on resupply_routes
  for each row execute function tg_set_updated_at();

create table if not exists resupply_loads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  route_id uuid not null references resupply_routes(id) on delete cascade,
  formula_id uuid not null references formulas(id),
  sacks_loaded real not null,
  sacks_distributed real not null default 0,
  sacks_returned real not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger resupply_loads_updated before update on resupply_loads
  for each row execute function tg_set_updated_at();

create table if not exists resupply_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  route_id uuid not null references resupply_routes(id) on delete cascade,
  paddock_id uuid not null references paddocks(id),
  formula_id uuid not null references formulas(id),
  sacks_delivered real not null,
  delivered_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger resupply_deliveries_updated before update on resupply_deliveries
  for each row execute function tg_set_updated_at();

-- ---------------------------------------------------------------------
-- inventory_events: ledger de movimentações (entradas, saídas, ajustes, perdas)
-- Fonte de verdade p/ relatórios de consumo, perdas, diferenças.
-- event_type:
--   ENTRADA_CENTRAL, SAIDA_CENTRAL_ROTA, RETORNO_CENTRAL_ROTA,
--   ENTREGA_BOMBONA, AJUSTE_PERDA_CENTRAL, AJUSTE_PERDA_BOMBONA,
--   CONSUMO_BOMBONA (reservado p/ abatimento futuro baseado em curva de consumo)
-- sacks_delta positivo = entrada; negativo = saída.
-- ---------------------------------------------------------------------
create table if not exists inventory_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  event_type text not null,
  formula_id uuid not null references formulas(id),
  paddock_id uuid references paddocks(id),
  sacks_delta real not null,
  reason text,
  user_id uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger inventory_events_updated before update on inventory_events
  for each row execute function tg_set_updated_at();
create index if not exists idx_inv_events_formula on inventory_events(formula_id, created_at desc);
create index if not exists idx_inv_events_paddock on inventory_events(paddock_id, created_at desc);
create index if not exists idx_inv_events_type on inventory_events(event_type, created_at desc);

-- ---------------------------------------------------------------------
-- activity_log: auditoria com GPS
-- ---------------------------------------------------------------------
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique,
  user_id uuid references auth.users(id),
  action text not null,
  entity_table text,
  entity_id uuid,
  payload jsonb,
  gps_lat double precision,
  gps_lng double precision,
  gps_accuracy_m double precision,
  device_id text,
  occurred_at timestamptz not null,
  synced_at timestamptz not null default now()
);
create index if not exists idx_activity_user_date on activity_log (user_id, occurred_at desc);
create index if not exists idx_activity_entity on activity_log (entity_table, entity_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table profiles              enable row level security;
alter table grass_types           enable row level security;
alter table formulas              enable row level security;
alter table paddocks              enable row level security;
alter table water_tanks           enable row level security;
alter table farm_boundaries       enable row level security;
alter table herd                  enable row level security;
alter table herd_events           enable row level security;
alter table rondas                enable row level security;
alter table supplement_evals      enable row level security;
alter table bombona_evals         enable row level security;
alter table forage_evals          enable row level security;
alter table water_evals           enable row level security;
alter table health_evals          enable row level security;
alter table fence_evals           enable row level security;
alter table visual_weight_evals   enable row level security;
alter table washing_evals         enable row level security;
alter table biological_water_evals enable row level security;
alter table inventory             enable row level security;
alter table resupply_routes       enable row level security;
alter table resupply_loads        enable row level security;
alter table resupply_deliveries   enable row level security;
alter table inventory_events      enable row level security;
alter table activity_log          enable row level security;

-- Profiles: todo autenticado lê; só o próprio ou admin escreve; role só admin muda.
create policy "profiles_read" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_self" on profiles for update
  using (auth.uid() = id or is_admin())
  with check (auth.uid() = id or is_admin());

-- Catálogos (grass_types, formulas, paddocks, water_tanks, farm_boundaries):
-- leitura livre p/ autenticados; escrita só admin.
do $$
declare t text;
begin
  foreach t in array array['grass_types','formulas','paddocks','water_tanks','farm_boundaries']
  loop
    execute format('create policy %I on %I for select using (auth.role() = ''authenticated'');', t || '_read', t);
    execute format('create policy %I on %I for insert with check (is_admin());', t || '_ins_admin', t);
    execute format('create policy %I on %I for update using (is_admin()) with check (is_admin());', t || '_upd_admin', t);
    execute format('create policy %I on %I for delete using (is_admin());', t || '_del_admin', t);
  end loop;
end $$;

-- Dados operacionais (rondas, evals, herd, inventory, resupply_*, herd_events):
-- autenticados leem tudo; escrita livre p/ autenticados (peao + admin).
-- Admin pode deletar; peão só atualiza linhas que criou.
do $$
declare t text;
begin
  foreach t in array array[
    'herd','herd_events','rondas',
    'supplement_evals','bombona_evals','forage_evals','water_evals',
    'health_evals','fence_evals','visual_weight_evals','washing_evals',
    'biological_water_evals',
    'inventory','resupply_routes','resupply_loads','resupply_deliveries',
    'inventory_events'
  ]
  loop
    execute format('create policy %I on %I for select using (auth.role() = ''authenticated'');', t || '_read', t);
    execute format('create policy %I on %I for insert with check (auth.role() = ''authenticated'');', t || '_ins', t);
    execute format('create policy %I on %I for update using (is_admin() or created_by = auth.uid()) with check (is_admin() or created_by = auth.uid());', t || '_upd', t);
    execute format('create policy %I on %I for delete using (is_admin());', t || '_del', t);
  end loop;
end $$;

-- activity_log: cada user lê só os próprios (admin lê todos); insert livre;
-- ninguém atualiza/deleta (auditoria imutável).
create policy "activity_log_read_own" on activity_log for select
  using (user_id = auth.uid() or is_admin());
create policy "activity_log_insert" on activity_log for insert
  with check (auth.role() = 'authenticated' and (user_id = auth.uid() or user_id is null));
