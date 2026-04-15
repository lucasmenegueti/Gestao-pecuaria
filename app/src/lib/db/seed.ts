export const SEED_SQL = `
-- Users (password is "123456" — just a placeholder hash)
INSERT OR IGNORE INTO users (username, name, role, password_hash) VALUES
  ('admin', 'Administrador', 'admin', '123456'),
  ('joao.peao', 'João Peão', 'peao', '123456'),
  ('maria.peao', 'Maria Peão', 'peao', '123456');

-- Grass Types
INSERT OR IGNORE INTO grass_types (name, entry_height_cm, exit_height_cm) VALUES
  ('Braquiarão', 40, 20),
  ('Mombaça', 80, 40),
  ('Tifton', 25, 10);

-- Formulas
INSERT OR IGNORE INTO formulas (name, kg_per_sack, target_consumption_g_per_day) VALUES
  ('Probeef Reprodução', 25, 100),
  ('Engorda 3 KG', 25, 3000),
  ('Recria Top Most', 25, 200),
  ('Sal Mineral', 30, 80),
  ('Proteinado Seco', 25, 150);

-- Paddocks
INSERT OR IGNORE INTO paddocks (name, area_hectares, grass_type_id, latitude, longitude) VALUES
  ('Pasto 14', 45, 1, -15.30, -45.60),
  ('Pasto 14A', 52, 1, -15.31, -45.61),
  ('Pasto 15', 38, 1, -15.32, -45.62),
  ('Pasto 15A', 41, 1, -15.33, -45.63),
  ('Pasto 16', 60, 1, -15.34, -45.64),
  ('Pasto 17', 35, 2, -15.35, -45.65),
  ('Pasto 18', 70, 1, -15.36, -45.66),
  ('Pasto 19', 30, 2, -15.37, -45.67),
  ('Pasto 20', 55, 1, -15.38, -45.68),
  ('Pasto 21', 48, 1, -15.39, -45.69);

-- Herd
INSERT OR IGNORE INTO herd (paddock_id, category, head_count, avg_weight_kg) VALUES
  (1, 'GARROTE', 45, 350),
  (1, 'NOVILHA', 20, 280),
  (1, 'VACA', 15, 450),
  (1, 'BEZERRO MAMANDO', 5, 80),
  (2, 'BOI', 72, 420),
  (3, 'GARROTE', 40, 310),
  (3, 'BEZERRO', 25, 150),
  (4, 'NOVILHA', 90, 290),
  (5, 'VACA', 60, 460),
  (5, 'BEZERRA MAMANDO', 30, 70),
  (5, 'BEZERRO MAMANDO', 20, 75),
  (6, 'GARROTE', 55, 320),
  (7, 'NOVILHA', 95, 300),
  (8, 'TOURO', 30, 600),
  (9, 'BOI', 80, 440),
  (10, 'VACA', 40, 470),
  (10, 'BEZERRA', 27, 200);

-- Central Inventory
INSERT OR IGNORE INTO inventory (formula_id, quantity_sacks, min_sacks, location) VALUES
  (1, 200, 10, 'central'),
  (2, 15, 8, 'central'),
  (4, 3, 15, 'central'),
  (5, 50, 5, 'central');

-- Bombona Inventory
INSERT OR IGNORE INTO inventory (formula_id, quantity_sacks, min_sacks, location, paddock_id, last_resupply_date) VALUES
  (1, 8, 2, 'bombona', 1, '2026-04-07'),
  (1, 0, 2, 'bombona', 2, '2026-04-02'),
  (1, 2, 2, 'bombona', 3, '2026-04-05'),
  (4, 5, 2, 'bombona', 4, '2026-04-07'),
  (4, 3, 2, 'bombona', 5, '2026-04-05'),
  (5, 6, 2, 'bombona', 6, '2026-04-08');
`;
