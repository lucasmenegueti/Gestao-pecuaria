export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'peao',
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grass_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  entry_height_cm REAL NOT NULL,
  exit_height_cm REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS formulas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  kg_per_sack REAL NOT NULL,
  target_consumption_g_per_day REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS paddocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area_hectares REAL NOT NULL,
  grass_type_id INTEGER NOT NULL,
  latitude REAL,
  longitude REAL,
  active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (grass_type_id) REFERENCES grass_types(id)
);

CREATE TABLE IF NOT EXISTS herd (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paddock_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  head_count INTEGER NOT NULL,
  avg_weight_kg REAL,
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id)
);

CREATE TABLE IF NOT EXISTS rondas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paddock_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  completed INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

CREATE TABLE IF NOT EXISTS water_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  available INTEGER NOT NULL,
  quality TEXT,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

CREATE TABLE IF NOT EXISTS health_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  parasite_free INTEGER NOT NULL,
  affected_pct REAL,
  observations TEXT,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

CREATE TABLE IF NOT EXISTS washing_evals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ronda_id INTEGER NOT NULL,
  was_washed INTEGER NOT NULL,
  photo_uri TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ronda_id) REFERENCES rondas(id)
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  formula_id INTEGER NOT NULL,
  quantity_sacks REAL NOT NULL DEFAULT 0,
  min_sacks REAL NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT 'central',
  paddock_id INTEGER,
  last_resupply_date TEXT,
  FOREIGN KEY (formula_id) REFERENCES formulas(id),
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id)
);

CREATE TABLE IF NOT EXISTS resupply_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT NOT NULL DEFAULT 'loading',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS resupply_loads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL,
  formula_id INTEGER NOT NULL,
  sacks_loaded REAL NOT NULL,
  sacks_distributed REAL NOT NULL DEFAULT 0,
  sacks_returned REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (route_id) REFERENCES resupply_routes(id),
  FOREIGN KEY (formula_id) REFERENCES formulas(id)
);

CREATE TABLE IF NOT EXISTS resupply_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL,
  paddock_id INTEGER NOT NULL,
  formula_id INTEGER NOT NULL,
  sacks_delivered REAL NOT NULL,
  delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (route_id) REFERENCES resupply_routes(id),
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id),
  FOREIGN KEY (formula_id) REFERENCES formulas(id)
);

CREATE TABLE IF NOT EXISTS herd_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paddock_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL,
  head_count INTEGER NOT NULL,
  target_paddock_id INTEGER,
  notes TEXT,
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (paddock_id) REFERENCES paddocks(id)
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
