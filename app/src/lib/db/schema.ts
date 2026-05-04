// Colunas de sync comuns a todas as tabelas sincronizadas com o Supabase.
// - supabase_id: UUID do registro no servidor. NULL = ainda não sincronizado.
// - local_updated_at: timestamp local da última modificação (ISO).
// - deleted_at: soft delete; NULL = ativo.
// - pending_sync: 1 se tem mudança local não empurrada ainda.
// IMPORTANTE: em SQLite, colunas precisam vir ANTES de FOREIGN KEY clauses.
// Então inserimos SYNC logo antes dos FKs em cada tabela.
// sync_rev: marker que o engine de sync incrementa em toda escrita vinda do servidor.
// O trigger de "mark dirty" checa se sync_rev NÃO mudou — assim mutações locais
// (que não tocam sync_rev) disparam o trigger, e mutações de sync (que incrementam)
// não. Evita o loop push→pull→dirty→push observado antes.
const SYNC = `
  supabase_id TEXT UNIQUE,
  local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  pending_sync INTEGER NOT NULL DEFAULT 1,
  sync_rev INTEGER NOT NULL DEFAULT 0`;

// Tabelas mutáveis que ganham trigger de "dirty-on-update". Toda tabela
// `appendOnly: false` em SYNCED_TABLES PRECISA estar aqui — sem isso, UPDATEs
// locais não disparam pending_sync=1 e o engine de push nunca envia a mudança.
// Bug observado em produção (2026-04-27): rotas de reabastecimento finalizadas
// localmente nunca chegavam ao servidor; pull subsequente sobrescrevia local
// com status='in_progress' do servidor → banner "rota em andamento" ressuscitava.
const MUTABLE_TABLES = [
  'grass_types', 'formulas', 'paddocks', 'water_tanks', 'farm_boundaries',
  'herd', 'inventory', 'inspection_requests',
  'resupply_routes', 'resupply_loads',
  'app_settings',
];

const DIRTY_TRIGGERS = MUTABLE_TABLES.map((t) => `
CREATE TRIGGER IF NOT EXISTS tg_${t}_mark_dirty
AFTER UPDATE ON ${t}
FOR EACH ROW
WHEN NEW.sync_rev = OLD.sync_rev
BEGIN
  UPDATE ${t} SET pending_sync = 1, local_updated_at = datetime('now') WHERE id = NEW.id;
END;`).join('\n');

export const CREATE_TABLES_SQL = `
-- users: cache local dos profiles do Supabase Auth.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'peao',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- sync_state: metadados de sincronização (1 linha só, id=1).
-- last_pull_at é o CURSOR de delta sync (avança só quando chegam rows novas).
-- last_sync_at é o TIMESTAMP DE EXIBIÇÃO ("última sincronização feita") —
-- avança em todo ciclo bem-sucedido, mesmo sem rows novas. Sem isso o Painel
-- parecia que nunca ressincronizava quando o server estava em dia.
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_pull_at TEXT,
  last_push_at TEXT,
  last_sync_at TEXT
);
INSERT OR IGNORE INTO sync_state (id) VALUES (1);

CREATE TABLE IF NOT EXISTS grass_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  entry_height_cm REAL NOT NULL,
  exit_height_cm REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,${SYNC}
);

CREATE TABLE IF NOT EXISTS formulas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  kg_per_sack REAL NOT NULL,
  target_g_per_kg_body_day REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,${SYNC}
);

CREATE TABLE IF NOT EXISTS paddocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area_hectares REAL NOT NULL,
  grass_type_id INTEGER NOT NULL,
  latitude REAL,
  longitude REAL,
  center_lat REAL,
  center_lng REAL,
  geometry TEXT,
  active INTEGER NOT NULL DEFAULT 1,${SYNC},
  FOREIGN KEY (grass_type_id) REFERENCES grass_types(id)
);

CREATE TABLE IF NOT EXISTS water_tanks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,${SYNC}
);

CREATE TABLE IF NOT EXISTS farm_boundaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  geometry TEXT NOT NULL,${SYNC}
);

CREATE TABLE IF NOT EXISTS herd (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paddock_id INTEGER,
  category TEXT NOT NULL,
  head_count INTEGER NOT NULL,
  avg_weight_kg REAL,${SYNC},
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_herd_alloc ON herd(paddock_id, category) WHERE paddock_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_herd_pool ON herd(category) WHERE paddock_id IS NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS rondas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paddock_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now','localtime')),
  completed INTEGER NOT NULL DEFAULT 0,${SYNC},
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id)
);

CREATE TABLE IF NOT EXISTS supplement_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  trough_score TEXT NOT NULL,
  restocked INTEGER NOT NULL DEFAULT 0,
  formula_id INTEGER,
  sacks_in_trough REAL,
  trough_access TEXT NOT NULL DEFAULT 'BOM',
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (ronda_id) REFERENCES rondas(id),
  FOREIGN KEY (formula_id) REFERENCES formulas(id)
);

CREATE TABLE IF NOT EXISTS bombona_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  has_stock INTEGER NOT NULL,
  formula_id INTEGER,
  sacks REAL,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (ronda_id) REFERENCES rondas(id),
  FOREIGN KEY (formula_id) REFERENCES formulas(id)
);

CREATE TABLE IF NOT EXISTS forage_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  measurement_type TEXT NOT NULL,
  measure_1_cm REAL NOT NULL,
  measure_2_cm REAL NOT NULL,
  measure_3_cm REAL NOT NULL,
  average_cm REAL NOT NULL,
  quality TEXT NOT NULL,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

CREATE TABLE IF NOT EXISTS water_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  available INTEGER NOT NULL,
  quality TEXT,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

CREATE TABLE IF NOT EXISTS health_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  parasite_free INTEGER NOT NULL,
  affected_pct REAL,
  observations TEXT,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

CREATE TABLE IF NOT EXISTS fence_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  voltage REAL NOT NULL,
  is_electric INTEGER NOT NULL DEFAULT 1,
  prevents_mixing INTEGER NOT NULL,
  classification TEXT NOT NULL,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

CREATE TABLE IF NOT EXISTS visual_weight_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  estimated_weight_kg REAL NOT NULL,
  previous_weight_kg REAL,
  previous_date TEXT,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

CREATE TABLE IF NOT EXISTS washing_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  was_washed INTEGER NOT NULL,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

-- Biológico aplicado na água: applied=0 = "não apliquei hoje" (salva registro mesmo assim);
-- quando applied=1, quantity_g guarda quantos gramas foram colocados (1–1000g).
CREATE TABLE IF NOT EXISTS biological_water_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  applied INTEGER NOT NULL,
  quantity_g REAL,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

-- Índices pro alerts.ts (dashboard focus roda rondasToday + latestEvalPerPaddock):
--  - rondas(date): filtro "feitas hoje"
--  - *_evals(ronda_id): UNION ALL de 8 tabelas + JOIN rondas em latestEvalPerPaddock
CREATE INDEX IF NOT EXISTS idx_rondas_date ON rondas(date);
CREATE INDEX IF NOT EXISTS idx_supplement_evals_ronda ON supplement_evals(ronda_id);
CREATE INDEX IF NOT EXISTS idx_bombona_evals_ronda ON bombona_evals(ronda_id);
CREATE INDEX IF NOT EXISTS idx_forage_evals_ronda ON forage_evals(ronda_id);
CREATE INDEX IF NOT EXISTS idx_water_evals_ronda ON water_evals(ronda_id);
CREATE INDEX IF NOT EXISTS idx_health_evals_ronda ON health_evals(ronda_id);
CREATE INDEX IF NOT EXISTS idx_fence_evals_ronda ON fence_evals(ronda_id);
CREATE INDEX IF NOT EXISTS idx_visual_weight_evals_ronda ON visual_weight_evals(ronda_id);
CREATE INDEX IF NOT EXISTS idx_washing_evals_ronda ON washing_evals(ronda_id);
CREATE INDEX IF NOT EXISTS idx_biological_water_evals_ronda ON biological_water_evals(ronda_id);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  formula_id INTEGER NOT NULL,
  quantity_sacks REAL NOT NULL DEFAULT 0,
  min_sacks REAL NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT 'central',
  paddock_id INTEGER,
  last_resupply_date TEXT,${SYNC},
  FOREIGN KEY (formula_id) REFERENCES formulas(id),
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id)
);

CREATE TABLE IF NOT EXISTS resupply_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT NOT NULL DEFAULT 'loading',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC}
);

CREATE TABLE IF NOT EXISTS resupply_loads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL,
  formula_id INTEGER NOT NULL,
  sacks_loaded REAL NOT NULL,
  sacks_distributed REAL NOT NULL DEFAULT 0,
  sacks_returned REAL NOT NULL DEFAULT 0,${SYNC},
  FOREIGN KEY (route_id) REFERENCES resupply_routes(id),
  FOREIGN KEY (formula_id) REFERENCES formulas(id)
);

CREATE TABLE IF NOT EXISTS resupply_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL,
  paddock_id INTEGER NOT NULL,
  formula_id INTEGER NOT NULL,
  sacks_delivered REAL NOT NULL,
  delivered_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (route_id) REFERENCES resupply_routes(id),
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id),
  FOREIGN KEY (formula_id) REFERENCES formulas(id)
);

CREATE TABLE IF NOT EXISTS herd_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paddock_id INTEGER,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL,
  head_count INTEGER NOT NULL,
  target_paddock_id INTEGER,
  notes TEXT,
  weight_kg REAL,
  date TEXT NOT NULL DEFAULT (date('now','localtime')),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id)
);

CREATE TABLE IF NOT EXISTS inventory_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  formula_id INTEGER NOT NULL,
  paddock_id INTEGER,
  sacks_delta REAL NOT NULL,
  reason TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (formula_id) REFERENCES formulas(id),
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_events_formula ON inventory_events(formula_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_events_paddock ON inventory_events(paddock_id, created_at);

-- inspection_requests: admin delega ao peão quais piquetes precisam de inspeção
-- "sob demanda" (bombona, forragem, biológico, sanidade, peso visual, lavagem).
-- Solicitações são genéricas (qualquer peão resolve). Auto-completam quando o
-- peão preenche aquela seção da ronda no piquete.
CREATE TABLE IF NOT EXISTS inspection_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paddock_id INTEGER NOT NULL,
  eval_kind TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TEXT,
  completed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),${SYNC},
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id)
);
CREATE INDEX IF NOT EXISTS idx_insp_req_paddock_status ON inspection_requests(paddock_id, status);
CREATE INDEX IF NOT EXISTS idx_insp_req_status ON inspection_requests(status);

-- app_settings: chave-valor pra configurações (voltagens de cerca, limiares de alertas).
-- Todos os values são TEXT; caller faz JSON.parse ou Number() conforme o tipo.
-- Defaults populados via INSERT OR IGNORE — só entram na primeira criação da tabela.
-- Sincronizada via Supabase desde v0.7.8 — admin liga/desliga alerta e propaga
-- pra todos os devices. RLS no servidor restringe write a admins; read é universal.
-- PK é id (não key) pra alinhar com o sync engine, que assume WHERE id = ?
-- em todas as tabelas SYNCED. key fica UNIQUE — settings.ts continua usando ele.
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),${SYNC}
);

INSERT OR IGNORE INTO app_settings (key, value) VALUES
  -- Cerca: voltagens que definem cada classificação (thresholds inclusivos)
  ('fence.voltage_forte', '4000'),
  ('fence.voltage_adequado', '2000'),
  ('fence.voltage_fraco', '1'),
  -- Alertas: cada bloco tem enabled + limiares específicos.
  -- Disabled: seção some do Painel; não gera evento no feed.
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
  -- JSON arrays de qualidades da WATER_QUALITY_OPTIONS que geram cada severidade
  ('alert.agua.warn_qualities', '["MEDIANA"]'),
  ('alert.agua.danger_qualities', '["RUIM"]'),
  ('alert.cerca.enabled', '1'),
  ('alert.cerca.warn_classifications', '["FRACO"]'),
  ('alert.cerca.danger_classifications', '["SEM CHOQUE"]'),
  ('alert.desalocados.enabled', '1'),
  -- Biológico: aplicado no dia da semana configurado (0=dom, 4=qui default).
  -- Se, a partir do último dia agendado, algum piquete com gado não recebeu
  -- biológico (applied=1), gera warn. Alerta só sai quando é aplicado.
  ('alert.biologico.enabled', '1'),
  ('alert.biologico.weekday', '4');

-- activity_log: registro de cada ação do app + resposta do servidor.
-- Usado p/ debug e rastreamento. Rolling window (últimas 1000 entries).
-- level: 'info', 'warn', 'error'
-- category: 'auth', 'sync', 'mutation', 'ui', 'net'
-- data: JSON com detalhes (request/response, erro, contexto)
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  data TEXT,
  user_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity_log(ts DESC);

${DIRTY_TRIGGERS}
`;

// Lista de tabelas que o sync conhece, na ordem correta de pull/push (FKs respeitadas).
export const SYNCED_TABLES = [
  { name: 'grass_types', appendOnly: false, fkCols: [] },
  { name: 'formulas', appendOnly: false, fkCols: [] },
  { name: 'paddocks', appendOnly: false, fkCols: [{ col: 'grass_type_id', table: 'grass_types' }] },
  { name: 'water_tanks', appendOnly: false, fkCols: [] },
  { name: 'farm_boundaries', appendOnly: false, fkCols: [] },
  { name: 'herd', appendOnly: false, fkCols: [{ col: 'paddock_id', table: 'paddocks' }] },
  { name: 'inventory', appendOnly: false, fkCols: [
    { col: 'formula_id', table: 'formulas' },
    { col: 'paddock_id', table: 'paddocks' },
  ] },
  { name: 'herd_events', appendOnly: true, fkCols: [
    { col: 'paddock_id', table: 'paddocks' },
    { col: 'target_paddock_id', table: 'paddocks' },
  ] },
  { name: 'inventory_events', appendOnly: true, fkCols: [
    { col: 'formula_id', table: 'formulas' },
    { col: 'paddock_id', table: 'paddocks' },
  ] },
  { name: 'rondas', appendOnly: true, fkCols: [{ col: 'paddock_id', table: 'paddocks' }] },
  { name: 'supplement_evals', appendOnly: true, fkCols: [
    { col: 'ronda_id', table: 'rondas' },
    { col: 'formula_id', table: 'formulas' },
  ] },
  { name: 'bombona_evals', appendOnly: true, fkCols: [
    { col: 'ronda_id', table: 'rondas' },
    { col: 'formula_id', table: 'formulas' },
  ] },
  { name: 'forage_evals', appendOnly: true, fkCols: [{ col: 'ronda_id', table: 'rondas' }] },
  { name: 'water_evals', appendOnly: true, fkCols: [{ col: 'ronda_id', table: 'rondas' }] },
  { name: 'health_evals', appendOnly: true, fkCols: [{ col: 'ronda_id', table: 'rondas' }] },
  { name: 'fence_evals', appendOnly: true, fkCols: [{ col: 'ronda_id', table: 'rondas' }] },
  { name: 'visual_weight_evals', appendOnly: true, fkCols: [{ col: 'ronda_id', table: 'rondas' }] },
  { name: 'washing_evals', appendOnly: true, fkCols: [{ col: 'ronda_id', table: 'rondas' }] },
  { name: 'biological_water_evals', appendOnly: true, fkCols: [{ col: 'ronda_id', table: 'rondas' }] },
  { name: 'resupply_routes', appendOnly: false, fkCols: [] },
  { name: 'resupply_loads', appendOnly: false, fkCols: [
    { col: 'route_id', table: 'resupply_routes' },
    { col: 'formula_id', table: 'formulas' },
  ] },
  { name: 'resupply_deliveries', appendOnly: true, fkCols: [
    { col: 'route_id', table: 'resupply_routes' },
    { col: 'paddock_id', table: 'paddocks' },
    { col: 'formula_id', table: 'formulas' },
  ] },
  { name: 'inspection_requests', appendOnly: false, fkCols: [{ col: 'paddock_id', table: 'paddocks' }] },
  { name: 'app_settings', appendOnly: false, fkCols: [] },
] as const;

export type SyncedTableName = (typeof SYNCED_TABLES)[number]['name'];
