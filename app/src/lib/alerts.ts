import type * as SQLite from 'expo-sqlite';
import { effectiveWeightKg } from '@/constants';

// Alertas agregados pra o Painel. Cada função é autônoma e retorna lista pronta.
// Todas as seções podem ficar vazias — UI mostra "Sem alertas" quando for o caso.

export interface RondaIssue {
  paddockName: string;
  paddockId: number;
  kind: 'agua' | 'sanidade' | 'cerca';
  detail: string;
  severity: 'warning' | 'danger';
}

export interface DesalocatedEntry {
  category: string;
  heads: number;
}

export interface BombonaRisk {
  paddockName: string;
  paddockId: number;
  formulaName: string;
  daysLeft: number; // pode ser negativo (já deveria estar vazio)
  severity: 'warning' | 'danger';
}

export interface CentralLowEntry {
  formulaName: string;
  have: number; // sacos no central
  need: number; // sacos projetados p/ 30 dias
  daysLeft: number;
  severity: 'warning' | 'danger';
}

export interface AlertsData {
  rondasToday: number;
  paddocksWithCattle: number;
  ronda: RondaIssue[];
  desalocated: DesalocatedEntry[];
  desalocatedTotal: number;
  bombonas: BombonaRisk[];
  central: CentralLowEntry[];
}

const BOMBONA_WARN_DAYS = 3;
const BOMBONA_DANGER_DAYS = 0;
const CENTRAL_MONTH_DAYS = 30;

function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(fromIso: string | null | undefined, toIso: string): number {
  if (!fromIso) return 0;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!isFinite(from) || !isFinite(to)) return 0;
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

// Última avaliação de cada tipo por piquete via ROW_NUMBER() OVER (...)
async function latestEvalPerPaddock<T>(
  db: SQLite.SQLiteDatabase,
  evalTable: string,
  selectCols: string,
): Promise<T[]> {
  return db.getAllAsync<T>(`
    WITH ranked AS (
      SELECT r.paddock_id, ${selectCols}, e.created_at,
        ROW_NUMBER() OVER (PARTITION BY r.paddock_id ORDER BY e.created_at DESC) AS rn
      FROM ${evalTable} e
      JOIN rondas r ON r.id = e.ronda_id
    )
    SELECT * FROM ranked WHERE rn = 1
  `);
}

export async function loadAlerts(db: SQLite.SQLiteDatabase): Promise<AlertsData> {
  const today = todayIsoDate();

  // Regra: uma ronda só conta como "feita hoje" quando tem >= 2 tipos diferentes
  // de avaliação registrados (suplementação, bombona, forragem, aguada, sanidade,
  // cerca, peso visual, lavagem). Abrir o piquete + preencher só um item não conta.
  // DISTINCT em cada subselect garante 1 linha/tabela/ronda; UNION ALL evita
  // o dedup global (mais barato que UNION e semanticamente equivalente aqui).
  const rondasTodayRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT r.paddock_id) as count
       FROM rondas r
      WHERE r.date = ?
        AND r.id IN (
          SELECT ronda_id FROM (
            SELECT DISTINCT ronda_id, 'supplement' AS t FROM supplement_evals
            UNION ALL SELECT DISTINCT ronda_id, 'bombona' FROM bombona_evals
            UNION ALL SELECT DISTINCT ronda_id, 'forage' FROM forage_evals
            UNION ALL SELECT DISTINCT ronda_id, 'water' FROM water_evals
            UNION ALL SELECT DISTINCT ronda_id, 'health' FROM health_evals
            UNION ALL SELECT DISTINCT ronda_id, 'fence' FROM fence_evals
            UNION ALL SELECT DISTINCT ronda_id, 'visual_weight' FROM visual_weight_evals
            UNION ALL SELECT DISTINCT ronda_id, 'washing' FROM washing_evals
          ) GROUP BY ronda_id HAVING COUNT(*) >= 2
        )`,
    [today]
  );
  const paddocksWithCattleRow = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(DISTINCT p.id) as count
    FROM paddocks p
    JOIN herd h ON h.paddock_id = p.id
    WHERE p.active = 1 AND h.head_count > 0
  `);

  // --- Ronda: água / sanidade / cerca em aberto (última avaliação ruim) ---

  const ronda: RondaIssue[] = [];

  const lastWater = await latestEvalPerPaddock<{ paddock_id: number; quality: string | null; available: number; created_at: string }>(
    db,
    'water_evals',
    'e.quality, e.available',
  );
  // Lavagens (washing_evals) resolvem alertas de água. Pega a mais recente por piquete.
  const lastWashing = await latestEvalPerPaddock<{ paddock_id: number; was_washed: number; created_at: string }>(
    db,
    'washing_evals',
    'e.was_washed',
  );
  const lastWashByPaddock: Record<number, string> = {};
  lastWashing.forEach((w) => {
    if (w.was_washed) lastWashByPaddock[w.paddock_id] = w.created_at;
  });
  const lastHealth = await latestEvalPerPaddock<{ paddock_id: number; parasite_free: number; affected_pct: number | null }>(
    db,
    'health_evals',
    'e.parasite_free, e.affected_pct',
  );
  const lastFence = await latestEvalPerPaddock<{ paddock_id: number; classification: string; prevents_mixing: number }>(
    db,
    'fence_evals',
    'e.classification, e.prevents_mixing',
  );
  const paddockNames = await db.getAllAsync<{ id: number; name: string }>(
    'SELECT id, name FROM paddocks WHERE active = 1'
  );
  const nameOf: Record<number, string> = {};
  paddockNames.forEach((p) => { nameOf[p.id] = p.name; });

  lastWater.forEach((w) => {
    // Lavagem posterior ao último water_eval ruim limpa o alerta.
    const washingAt = lastWashByPaddock[w.paddock_id];
    const washedAfter = washingAt && washingAt > w.created_at;
    if (!w.available) {
      // "sem água" não se resolve com lavagem — só com nova avaliação.
      ronda.push({
        paddockId: w.paddock_id, paddockName: nameOf[w.paddock_id] || `#${w.paddock_id}`,
        kind: 'agua', detail: 'Sem água', severity: 'danger',
      });
    } else if (w.quality === 'MEDIANA' && !washedAfter) {
      ronda.push({
        paddockId: w.paddock_id, paddockName: nameOf[w.paddock_id] || `#${w.paddock_id}`,
        kind: 'agua', detail: 'Água mediana', severity: 'warning',
      });
    } else if (w.quality === 'RUIM' && !washedAfter) {
      ronda.push({
        paddockId: w.paddock_id, paddockName: nameOf[w.paddock_id] || `#${w.paddock_id}`,
        kind: 'agua', detail: 'Água ruim', severity: 'danger',
      });
    }
  });

  lastHealth.forEach((h) => {
    const pct = h.affected_pct ?? 0;
    if (!h.parasite_free || pct > 0) {
      ronda.push({
        paddockId: h.paddock_id, paddockName: nameOf[h.paddock_id] || `#${h.paddock_id}`,
        kind: 'sanidade',
        detail: pct > 0 ? `${pct.toFixed(0)}% do gado afetado` : 'Parasitas presentes',
        severity: pct >= 20 ? 'danger' : 'warning',
      });
    }
  });

  lastFence.forEach((f) => {
    if (f.prevents_mixing === 0) {
      ronda.push({
        paddockId: f.paddock_id, paddockName: nameOf[f.paddock_id] || `#${f.paddock_id}`,
        kind: 'cerca', detail: 'Cerca não evita mistura', severity: 'danger',
      });
    } else if (f.classification === 'FRACO' || f.classification === 'SEM CHOQUE') {
      ronda.push({
        paddockId: f.paddock_id, paddockName: nameOf[f.paddock_id] || `#${f.paddock_id}`,
        kind: 'cerca', detail: `Cerca ${f.classification.toLowerCase()}`,
        severity: f.classification === 'SEM CHOQUE' ? 'danger' : 'warning',
      });
    }
  });

  // --- Rebanho: gado desalocado ---

  const desalocatedRows = await db.getAllAsync<{ category: string; heads: number }>(
    'SELECT category, SUM(head_count) as heads FROM herd WHERE paddock_id IS NULL GROUP BY category'
  );
  const desalocated: DesalocatedEntry[] = desalocatedRows.map((r) => ({
    category: r.category, heads: r.heads,
  }));
  const desalocatedTotal = desalocated.reduce((s, d) => s + d.heads, 0);

  // --- Estoque: bombonas em risco (curva de consumo por peso vivo) ---

  // Carrega todos os lotes de gado alocados: vamos calcular peso vivo total por piquete.
  const allLots = await db.getAllAsync<{
    paddock_id: number; category: string; head_count: number; avg_weight_kg: number | null;
  }>(`SELECT paddock_id, category, head_count, avg_weight_kg FROM herd WHERE paddock_id IS NOT NULL AND head_count > 0`);

  const bodyKgByPaddock: Record<number, number> = {};
  for (const l of allLots) {
    bodyKgByPaddock[l.paddock_id] = (bodyKgByPaddock[l.paddock_id] || 0) +
      l.head_count * effectiveWeightKg(l.category, l.avg_weight_kg);
  }

  const bombonaRows = await db.getAllAsync<{
    paddock_id: number; paddock_name: string; sacks: number; kg_per_sack: number;
    g_per_kg_body_day: number; last_resupply_date: string | null; formula_id: number; formula_name: string;
  }>(`
    SELECT p.id AS paddock_id, p.name AS paddock_name,
      i.quantity_sacks AS sacks,
      f.id AS formula_id, f.kg_per_sack, f.target_g_per_kg_body_day AS g_per_kg_body_day, f.name AS formula_name,
      i.last_resupply_date
    FROM paddocks p
    JOIN inventory i ON i.paddock_id = p.id AND i.location = 'bombona'
    JOIN formulas f ON f.id = i.formula_id
    WHERE p.active = 1
  `);

  const bombonas: BombonaRisk[] = [];
  for (const b of bombonaRows) {
    const bodyKg = bodyKgByPaddock[b.paddock_id] || 0;
    if (bodyKg <= 0) continue;
    const dailyKg = (bodyKg * b.g_per_kg_body_day) / 1000;
    if (dailyKg <= 0) continue;
    const initialKg = b.sacks * b.kg_per_sack;
    const daysSinceResupply = daysBetween(b.last_resupply_date, today);
    const remainingKg = initialKg - dailyKg * daysSinceResupply;
    const daysLeft = Math.floor(remainingKg / dailyKg);
    if (daysLeft > BOMBONA_WARN_DAYS) continue;
    bombonas.push({
      paddockId: b.paddock_id,
      paddockName: b.paddock_name,
      formulaName: b.formula_name,
      daysLeft,
      severity: daysLeft <= BOMBONA_DANGER_DAYS ? 'danger' : 'warning',
    });
  }
  bombonas.sort((a, b) => a.daysLeft - b.daysLeft);

  // --- Estoque central: < 30 dias de consumo (por peso vivo) ---

  // Peso vivo total por fórmula (somando piquetes que usam aquela fórmula na bombona)
  const formulaUsage = await db.getAllAsync<{
    formula_id: number; paddock_id: number;
  }>(`SELECT formula_id, paddock_id FROM inventory WHERE location = 'bombona'`);

  const bodyKgByFormula: Record<number, number> = {};
  for (const u of formulaUsage) {
    bodyKgByFormula[u.formula_id] = (bodyKgByFormula[u.formula_id] || 0) + (bodyKgByPaddock[u.paddock_id] || 0);
  }

  const formulaRows = await db.getAllAsync<{
    id: number; name: string; kg_per_sack: number; g_per_kg_body_day: number; central_sacks: number;
  }>(`
    SELECT f.id, f.name, f.kg_per_sack, f.target_g_per_kg_body_day AS g_per_kg_body_day,
      COALESCE((SELECT SUM(ic.quantity_sacks) FROM inventory ic
                WHERE ic.location = 'central' AND ic.formula_id = f.id), 0) AS central_sacks
    FROM formulas f
    WHERE f.active = 1
  `);

  const central: CentralLowEntry[] = [];
  for (const f of formulaRows) {
    const bodyKg = bodyKgByFormula[f.id] || 0;
    if (bodyKg <= 0) continue;
    const dailyKg = (bodyKg * f.g_per_kg_body_day) / 1000;
    if (dailyKg <= 0) continue;
    const dailySacks = dailyKg / f.kg_per_sack;
    const needForMonth = dailySacks * CENTRAL_MONTH_DAYS;
    if (f.central_sacks >= needForMonth) continue;
    const daysLeft = Math.floor(f.central_sacks / dailySacks);
    central.push({
      formulaName: f.name,
      have: Math.round(f.central_sacks * 10) / 10,
      need: Math.round(needForMonth * 10) / 10,
      daysLeft,
      severity: daysLeft <= 7 ? 'danger' : 'warning',
    });
  }
  central.sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    rondasToday: rondasTodayRow?.count ?? 0,
    paddocksWithCattle: paddocksWithCattleRow?.count ?? 0,
    ronda,
    desalocated,
    desalocatedTotal,
    bombonas,
    central,
  };
}
