export const SEED_HERD_SQL = `
INSERT OR IGNORE INTO herd (paddock_id, category, head_count, avg_weight_kg) VALUES
  (5, 'NOVILHA', 61, 198),
  (11, 'GARROTE', 110, 375),
  (15, 'GARROTE', 61, 330),
  (19, 'GARROTE', 77, 206),
  (21, 'VACA PARIDA', 73, 450),
  (21, 'BEZERRO MAMANDO', 37, 95),
  (21, 'BEZERRA MAMANDO', 27, 90),
  (24, 'VACA PARIDA', 5, 450),
  (24, 'BEZERRA MAMANDO', 4, 100),
  (24, 'BEZERRO MAMANDO', 1, 100),
  (25, 'BEZERRA MAMANDO', 13, 100),
  (25, 'VACA PARIDA', 11, 450),
  (25, 'BEZERRO MAMANDO', 4, 100),
  (29, 'GARROTE', 90, 288),
  (32, 'GARROTE', 71, 300),
  (33, 'GARROTE', 74, 180),
  (35, 'GARROTE', 102, 254),
  (36, 'GARROTE', 90, 273),
  (37, 'GARROTE', 107, 338),
  (38, 'GARROTE', 93, 216),
  (40, 'NOVILHA', 89, 319),
  (43, 'NOVILHA', 84, 254),
  (45, 'VACA SOLTEIRA', 23, 450),
  (65, 'GARROTE', 103, 350),
  (70, 'GARROTE', 108, 375),
  (75, 'GARROTE', 87, 337),
  (78, 'BEZERRO MAMANDO', 7, 100),
  (78, 'VACA PARIDA', 5, 450),
  (78, 'BEZERRA MAMANDO', 2, 100),
  (82, 'VACA PARIDA', 83, 470),
  (82, 'BEZERRA MAMANDO', 54, 71),
  (82, 'BEZERRO MAMANDO', 24, 80),
  (84, 'NOVILHA', 45, 312),
  (87, 'VACA PRENHA', 103, 450),
  (87, 'BEZERRO MAMANDO', 45, 118),
  (87, 'BEZERRA MAMANDO', 37, 114),
  (90, 'VACA PRENHA', 98, 450),
  (90, 'BEZERRA MAMANDO', 34, 100),
  (90, 'BEZERRO MAMANDO', 28, 100),
  (91, 'VACA PRENHA', 93, 450),
  (91, 'BEZERRA MAMANDO', 48, 100),
  (91, 'BEZERRO MAMANDO', 44, 100),
  (93, 'VACA PRENHA', 138, 450),
  (93, 'BEZERRO MAMANDO', 68, 120),
  (93, 'BEZERRA MAMANDO', 50, 130),
  (98, 'VACA PARIDA', 111, 420),
  (98, 'BEZERRO MAMANDO', 109, 140),
  (98, 'BEZERRA MAMANDO', 80, 130),
  (103, 'NOVILHA', 136, 279),
  (104, 'NOVILHA', 115, 201),
  (108, 'VACA PARIDA', 149, 450),
  (108, 'BEZERRO MAMANDO', 79, 120),
  (108, 'BEZERRA MAMANDO', 75, 115),
  (110, 'NOVILHA', 129, 312),
  (115, 'GARROTE', 110, 349),
  (116, 'GARROTE', 99, 387),
  (118, 'GARROTE', 110, 350),
  (123, 'GARROTE', 71, 221),
  (125, 'GARROTE', 71, 375);
`;

export const SEED_FORMULAS_SQL = `
-- target_g_per_kg_body_day = gramas de ração por kg de peso vivo por dia.
-- Ajustáveis em admin/formulas.
INSERT OR IGNORE INTO formulas (name, kg_per_sack, target_g_per_kg_body_day) VALUES
  ('Probeef Reprodução', 30, 0.25),
  ('Probeef Topmost Golden', 30, 0.5),
  ('Engorda 3 KG', 25, 7.5),
  ('Sal Mineral', 30, 0.2),
  ('Proteinado Seco', 25, 0.375);
`;

export const SEED_GRASS_TYPES_SQL = `
INSERT OR IGNORE INTO grass_types (name, entry_height_cm, exit_height_cm) VALUES
  ('Braquiarão', 40, 20),
  ('Mombaça', 80, 40),
  ('Tifton', 25, 10);
`;

// users agora vem do Supabase Auth; tabela local fica vazia até o primeiro pull
// popular com os profiles.
export const SEED_USERS_SQL = `-- (sem seed; populado via sync do Supabase)`;

// Estoque central atualizado em 2026-04-17 (dados reais da fazenda).
// Sacos de 30kg: 22020kg → 734 sacos de Topmost Golden; 12000kg → 400 de Reprodução.
// Demais fórmulas zeradas.
export const SEED_INVENTORY_CENTRAL_SQL = `
INSERT OR IGNORE INTO inventory (formula_id, quantity_sacks, min_sacks, location) VALUES
  (1, 400, 10, 'central'),
  (2, 734, 10, 'central'),
  (3, 0, 5, 'central'),
  (4, 0, 5, 'central'),
  (5, 0, 5, 'central');
`;

// Bombonas zeradas — serão preenchidas via fluxo de reabastecimento no app.
export const SEED_INVENTORY_BOMBONA_SQL = `
-- Vazio: bombonas são criadas via reabastecimento (admin/reabastecimento).
`;

// Mantido pra compatibilidade: bloca tudo que o provider roda no primeiro boot
// quando users ainda está vazio. Agora cada bloco tem seu próprio export também.
export const SEED_SQL = `
${SEED_USERS_SQL}
${SEED_GRASS_TYPES_SQL}
${SEED_FORMULAS_SQL}
${SEED_HERD_SQL}
${SEED_INVENTORY_CENTRAL_SQL}
${SEED_INVENTORY_BOMBONA_SQL}
`;
